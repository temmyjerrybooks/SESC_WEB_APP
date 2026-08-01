import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";

type IntentInput = {
  actorId: string;
  applicationId?: string;
  paymentId?: string;
  documentKind: "profile_photo" | "identity_document" | "payment_receipt";
  bucketId: "member-private" | "membership-documents" | "payment-receipts";
  storagePath: string;
  mimeType: string;
  fileExtension: string;
  size: number;
};

export type ResolvedPrivateUploadIntent = {
  bucketId: IntentInput["bucketId"];
  storagePath: string;
  mimeType: string;
  fileExtension: string;
  size: number;
  registeredDocumentId?: string;
  registeredReceiptId?: string;
};

type StalePrivateUploadIntent = {
  intentId: string;
  bucketId: IntentInput["bucketId"];
  storagePath: string;
};

function unavailable(): never {
  throw new Error("The protected upload request is unavailable.");
}

function firstRow(data: unknown): Record<string, unknown> | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? row as Record<string, unknown> : null;
}

async function cleanStalePrivateUploadIntents() {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_list_stale_private_upload_intents", {
    p_limit: 25,
  });
  if (error || !Array.isArray(data)) return;

  const stale = data.flatMap((row): StalePrivateUploadIntent[] => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    if (
      typeof record.intent_id !== "string" ||
      (record.bucket_id !== "member-private" && record.bucket_id !== "membership-documents" && record.bucket_id !== "payment-receipts") ||
      typeof record.storage_path !== "string"
    ) {
      return [];
    }
    return [{
      intentId: record.intent_id,
      bucketId: record.bucket_id,
      storagePath: record.storage_path,
    }];
  });

  await Promise.all(stale.map(async (intent) => {
    const { error: removalError } = await service.storage
      .from(intent.bucketId)
      .remove([intent.storagePath]);
    if (removalError) {
      await service.rpc("server_release_private_upload_intent_cleanup", {
        p_upload_intent_id: intent.intentId,
      });
      return;
    }
    await service.rpc("server_mark_private_upload_intent_cleaned", {
      p_upload_intent_id: intent.intentId,
    });
  }));
}

export async function createPrivateUploadIntent(input: IntentInput): Promise<string> {
  await cleanStalePrivateUploadIntents();
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_create_private_upload_intent", {
    p_actor_id: input.actorId,
    p_application_id: input.applicationId ?? null,
    p_payment_id: input.paymentId ?? null,
    p_document_kind: input.documentKind,
    p_bucket_id: input.bucketId,
    p_storage_path: input.storagePath,
    p_mime_type: input.mimeType,
    p_file_extension: input.fileExtension,
    p_byte_size: input.size,
  });
  if (error || typeof data !== "string") unavailable();
  return data;
}

/** Used after a failed byte check; only an unconsumed path may be removed. */
export async function abandonAndCleanPrivateUploadIntent(actorId: string, intentId: string) {
  if (!await abandonPrivateUploadIntent(actorId, intentId)) return;
  await cleanStalePrivateUploadIntents();
}

export async function getPrivateUploadIntent(input: Pick<
  IntentInput,
  "actorId" | "applicationId" | "paymentId" | "documentKind"
> & { intentId: string }): Promise<ResolvedPrivateUploadIntent> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_get_private_upload_intent", {
    p_actor_id: input.actorId,
    p_upload_intent_id: input.intentId,
    p_application_id: input.applicationId ?? null,
    p_payment_id: input.paymentId ?? null,
    p_document_kind: input.documentKind,
  });
  const row = firstRow(data);
  if (
    error ||
    !row ||
    (row.bucket_id !== "member-private" && row.bucket_id !== "membership-documents" && row.bucket_id !== "payment-receipts") ||
    typeof row.storage_path !== "string" ||
    typeof row.mime_type !== "string" ||
    typeof row.file_extension !== "string" ||
    typeof row.byte_size !== "number"
  ) {
    unavailable();
  }

  return {
    bucketId: row.bucket_id,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileExtension: row.file_extension,
    size: row.byte_size,
    registeredDocumentId: typeof row.registered_document_id === "string"
      ? row.registered_document_id
      : undefined,
    registeredReceiptId: typeof row.registered_receipt_id === "string"
      ? row.registered_receipt_id
      : undefined,
  };
}

/** Returns true only when the database has reserved the path for safe removal. */
export async function abandonPrivateUploadIntent(actorId: string, intentId: string): Promise<boolean> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_abandon_private_upload_intent", {
    p_actor_id: actorId,
    p_upload_intent_id: intentId,
  });
  return !error && data === true;
}
