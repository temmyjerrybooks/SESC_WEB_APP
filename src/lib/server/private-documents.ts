import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  createPrivateObjectPath,
  validatePrivateUpload,
  type PrivateDocumentKind,
} from "@/lib/storage/private-upload";
import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  abandonAndCleanPrivateUploadIntent,
  createPrivateUploadIntent,
  getPrivateUploadIntent,
} from "./private-upload-intents";

const documentBucketByKind: Record<
  Extract<PrivateDocumentKind, "profile_photo" | "identity_document">,
  "member-private" | "membership-documents"
> = {
  profile_photo: "member-private",
  identity_document: "membership-documents",
};

export type PreparedPrivateDocumentUpload = {
  intentId: string;
};

export async function preparePrivateDocumentUpload(input: {
  actorId: string;
  applicationId: string;
  kind: Extract<PrivateDocumentKind, "profile_photo" | "identity_document">;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<PreparedPrivateDocumentUpload> {
  const validation = validatePrivateUpload(input);
  if (!validation.ok) {
    throw new Error("The selected file does not meet the secure upload requirements.");
  }

  const bucketId = documentBucketByKind[input.kind];
  const mimeType = input.mimeType.toLowerCase();
  const storagePath = createPrivateObjectPath(input.actorId, input.kind, randomUUID());
  const intentId = await createPrivateUploadIntent({
    actorId: input.actorId,
    applicationId: input.applicationId,
    documentKind: input.kind,
    bucketId,
    storagePath,
    mimeType,
    fileExtension: validation.normalizedExtension,
    size: input.size,
  });

  return { intentId };
}

export async function completePrivateDocumentUpload(input: {
  actorId: string;
  applicationId: string;
  intentId: string;
  kind: Extract<PrivateDocumentKind, "profile_photo" | "identity_document">;
  file: File;
}): Promise<{ documentId: string }> {
  const validation = validatePrivateUpload({
    kind: input.kind,
    fileName: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
  });
  if (!validation.ok) {
    throw new Error("The selected file does not meet the secure upload requirements.");
  }

  const intent = await getPrivateUploadIntent({
    actorId: input.actorId,
    applicationId: input.applicationId,
    documentKind: input.kind,
    intentId: input.intentId,
  });
  if (intent.registeredDocumentId) return { documentId: intent.registeredDocumentId };
  if (
    intent.bucketId !== documentBucketByKind[input.kind] ||
    intent.mimeType !== input.file.type.toLowerCase() ||
    intent.fileExtension !== validation.normalizedExtension ||
    intent.size !== input.file.size
  ) {
    throw new Error("The protected upload request does not match the selected file.");
  }

  const service = createServiceRoleClient();
  let bytes = new Uint8Array(await input.file.arrayBuffer());
  let byteValidation = validatePrivateUpload({
    kind: input.kind,
    fileName: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
    bytes,
  });
  if (!byteValidation.ok || bytes.byteLength !== intent.size) {
    await abandonAndCleanPrivateUploadIntent(input.actorId, input.intentId);
    throw new Error("The uploaded document did not pass verification.");
  }

  const { error: uploadError } = await service.storage
    .from(intent.bucketId)
    .upload(intent.storagePath, bytes, {
      cacheControl: "0",
      contentType: intent.mimeType,
      upsert: false,
    });
  if (uploadError) {
    const { data: existingObject, error: existingError } = await service.storage
      .from(intent.bucketId)
      .download(intent.storagePath);
    if (existingError || !existingObject) {
      throw new Error("The protected document could not be stored.");
    }
    bytes = new Uint8Array(await existingObject.arrayBuffer());
    byteValidation = validatePrivateUpload({
      kind: input.kind,
      fileName: input.file.name,
      mimeType: input.file.type,
      size: input.file.size,
      bytes,
    });
    if (!byteValidation.ok || bytes.byteLength !== intent.size) {
      await abandonAndCleanPrivateUploadIntent(input.actorId, input.intentId);
      throw new Error("The uploaded document did not pass verification.");
    }
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const { data: documentId, error: registrationError } = await service.rpc(
    "server_register_member_document",
    {
      p_actor_id: input.actorId,
      p_application_id: input.applicationId,
      p_document_kind: input.kind,
      p_bucket_id: intent.bucketId,
      p_storage_path: intent.storagePath,
      p_mime_type: intent.mimeType,
      p_file_extension: byteValidation.normalizedExtension,
      p_byte_size: bytes.byteLength,
      p_checksum_sha256: checksum,
      p_upload_intent_id: input.intentId,
    },
  );

  if (registrationError || typeof documentId !== "string") {
    await abandonAndCleanPrivateUploadIntent(input.actorId, input.intentId);
    throw new Error("The document could not be registered securely.");
  }

  return { documentId };
}
