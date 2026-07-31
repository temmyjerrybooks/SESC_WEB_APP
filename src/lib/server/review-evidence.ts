import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";

import type { VerifiedActor } from "./actor";

type RpcRow = Record<string, unknown>;

function firstRow(data: unknown): RpcRow | null {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === "object" ? row as RpcRow : null;
}

function workflowFailure(): never {
  throw new Error("The protected review evidence is unavailable.");
}

export async function listApplicationDocumentsForReview(
  actor: VerifiedActor,
  applicationId: string,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_list_member_documents_for_review",
    { p_actor_id: actor.id, p_application_id: applicationId },
  );
  if (error || !Array.isArray(data)) workflowFailure();

  return (data as unknown[]).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as RpcRow;
    if (
      typeof row.document_id !== "string" ||
      (row.document_kind !== "profile_photo" && row.document_kind !== "identity_document") ||
      (row.status !== "pending" && row.status !== "verified")
    ) {
      return [];
    }
    return [{ documentId: row.document_id, kind: row.document_kind, status: row.status }];
  });
}

export async function prepareApplicationDocumentReview(
  actor: VerifiedActor,
  applicationId: string,
  documentId: string,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_prepare_member_document_review",
    {
      p_actor_id: actor.id,
      p_application_id: applicationId,
      p_document_id: documentId,
    },
  );
  const row = firstRow(data);
  const bucketId = row?.bucket_id;
  const storagePath = row?.storage_path;
  if (error || typeof bucketId !== "string" || typeof storagePath !== "string") {
    workflowFailure();
  }

  const { data: signed, error: signedError } = await service.storage
    .from(bucketId)
    .createSignedUrl(storagePath, 60);
  const signedUrl = signed?.signedUrl;
  if (signedError || !signedUrl) workflowFailure();
  return { signedUrl, expiresInSeconds: 60 };
}

export async function preparePaymentReceiptReview(
  actor: VerifiedActor,
  paymentId: string,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_prepare_payment_receipt_review",
    { p_actor_id: actor.id, p_payment_id: paymentId },
  );
  const row = firstRow(data);
  const storagePath = row?.storage_path;
  if (error || row?.bucket_id !== "payment-receipts" || typeof storagePath !== "string") {
    workflowFailure();
  }

  const { data: signed, error: signedError } = await service.storage
    .from("payment-receipts")
    .createSignedUrl(storagePath, 60);
  const signedUrl = signed?.signedUrl;
  if (signedError || !signedUrl) workflowFailure();
  return { signedUrl, expiresInSeconds: 60 };
}
