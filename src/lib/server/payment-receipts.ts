import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  createPrivateObjectPath,
  validatePrivateUpload,
} from "@/lib/storage/private-upload";
import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  abandonAndCleanPrivateUploadIntent,
  createPrivateUploadIntent,
  getPrivateUploadIntent,
} from "./private-upload-intents";

const paymentReceiptBucket = "payment-receipts";

export type PreparedPaymentReceiptUpload = {
  intentId: string;
};

function invalidReceiptUpload(): never {
  throw new Error("The selected payment receipt does not meet the secure upload requirements.");
}

/**
 * Creates a one-time server-side upload intent for a receipt object. Payment
 * ownership and eligibility are enforced by the route before this privileged
 * operation; registration repeats those checks in the database RPC after
 * byte-level validation.
 */
export async function preparePaymentReceiptUpload(input: {
  actorId: string;
  paymentId: string;
  fileName: string;
  mimeType: string;
  size: number;
}): Promise<PreparedPaymentReceiptUpload> {
  const validation = validatePrivateUpload({
    kind: "payment_receipt",
    fileName: input.fileName,
    mimeType: input.mimeType,
    size: input.size,
  });
  if (!validation.ok) invalidReceiptUpload();

  const storagePath = createPrivateObjectPath(
    input.actorId,
    "payment_receipt",
    randomUUID(),
  );
  const mimeType = input.mimeType.toLowerCase();
  const intentId = await createPrivateUploadIntent({
    actorId: input.actorId,
    paymentId: input.paymentId,
    documentKind: "payment_receipt",
    bucketId: paymentReceiptBucket,
    storagePath,
    mimeType,
    fileExtension: validation.normalizedExtension,
    size: input.size,
  });

  return { intentId };
}

export async function completePaymentReceiptUpload(input: {
  actorId: string;
  paymentId: string;
  intentId: string;
  file: File;
}): Promise<{ receiptId: string }> {
  const validation = validatePrivateUpload({
    kind: "payment_receipt",
    fileName: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
  });
  if (!validation.ok) invalidReceiptUpload();

  const intent = await getPrivateUploadIntent({
    actorId: input.actorId,
    paymentId: input.paymentId,
    documentKind: "payment_receipt",
    intentId: input.intentId,
  });
  if (intent.registeredReceiptId) return { receiptId: intent.registeredReceiptId };
  if (
    intent.bucketId !== paymentReceiptBucket ||
    intent.mimeType !== input.file.type.toLowerCase() ||
    intent.fileExtension !== validation.normalizedExtension ||
    intent.size !== input.file.size
  ) {
    throw new Error("The protected payment-receipt request does not match the selected file.");
  }

  const service = createServiceRoleClient();
  let bytes = new Uint8Array(await input.file.arrayBuffer());
  const byteValidation = validatePrivateUpload({
    kind: "payment_receipt",
    fileName: input.file.name,
    mimeType: input.file.type,
    size: input.file.size,
    bytes,
  });
  if (!byteValidation.ok || bytes.byteLength !== intent.size) {
    await abandonAndCleanPrivateUploadIntent(input.actorId, input.intentId);
    throw new Error("The uploaded payment receipt did not pass verification.");
  }

  const { error: uploadError } = await service.storage
    .from(paymentReceiptBucket)
    .upload(intent.storagePath, bytes, {
      cacheControl: "0",
      contentType: intent.mimeType,
      upsert: false,
    });
  if (uploadError) {
    const { data: existingObject, error: existingError } = await service.storage
      .from(paymentReceiptBucket)
      .download(intent.storagePath);
    if (existingError || !existingObject) {
      throw new Error("The protected payment receipt could not be stored.");
    }
    bytes = new Uint8Array(await existingObject.arrayBuffer());
    const existingValidation = validatePrivateUpload({
      kind: "payment_receipt",
      fileName: input.file.name,
      mimeType: input.file.type,
      size: input.file.size,
      bytes,
    });
    if (!existingValidation.ok || bytes.byteLength !== intent.size) {
      await abandonAndCleanPrivateUploadIntent(input.actorId, input.intentId);
      throw new Error("The uploaded payment receipt did not pass verification.");
    }
  }

  const checksum = createHash("sha256").update(bytes).digest("hex");
  const { data: receiptId, error: registrationError } = await service.rpc(
    "server_register_payment_receipt",
    {
      p_actor_id: input.actorId,
      p_payment_id: input.paymentId,
      p_storage_path: intent.storagePath,
      p_mime_type: intent.mimeType,
      p_file_extension: byteValidation.normalizedExtension,
      p_byte_size: bytes.byteLength,
      p_checksum_sha256: checksum,
      p_upload_intent_id: input.intentId,
    },
  );

  if (registrationError || typeof receiptId !== "string") {
    await abandonAndCleanPrivateUploadIntent(input.actorId, input.intentId);
    throw new Error("The payment receipt could not be registered securely.");
  }

  return { receiptId };
}
