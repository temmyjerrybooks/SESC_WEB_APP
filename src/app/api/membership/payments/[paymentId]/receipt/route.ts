import { createHash } from "node:crypto";

import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { admitPublicWorkflowRequest } from "@/lib/public-workflows/handlers";
import { createPublicWorkflowRepository } from "@/lib/public-workflows/repository";
import {
  completePaymentReceiptUpload,
  preparePaymentReceiptUpload,
} from "@/lib/server/payment-receipts";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { maximumPrivateUploadBytes } from "@/lib/storage/private-upload";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { paymentReceiptRequestSchema } from "@/lib/validation/server-workflows";

function paymentReceiptsUnavailable() {
  return unavailable(
    "Payment-receipt upload is not available until protected payment workflows have been verified.",
  );
}

const privateUploadRateLimit = { windowSeconds: 60 * 60, maxAttempts: 12 };
const maximumMultipartRequestBytes = maximumPrivateUploadBytes + 128 * 1024;

function actorUploadHash(actorId: string) {
  return createHash("sha256")
    .update(`sesc-private-upload:${actorId}`)
    .digest("hex");
}

function uploadFileFrom(form: FormData) {
  const file = form.get("file");
  return file && typeof file !== "string" && typeof file.arrayBuffer === "function"
    ? file
    : null;
}

function multipartRequestIsTooLarge(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;

  const parsed = Number(contentLength);
  return !Number.isSafeInteger(parsed) || parsed > maximumMultipartRequestBytes;
}

async function requireOwnedUploadablePayment(actorId: string, paymentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, payer_id, status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data || data.payer_id !== actorId) {
    throw new Error("The requested payment is unavailable.");
  }

  if (data.status !== "pending_receipt" && data.status !== "needs_resubmission") {
    throw new Error("This payment cannot accept a receipt.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ paymentId: string }> },
) {
  if (!isFeatureEnabled("manualPaymentVerification")) {
    return paymentReceiptsUnavailable();
  }

  try {
    const { paymentId } = await context.params;
    const actor = await requireVerifiedActor();
    const repository = createPublicWorkflowRepository(createServiceRoleClient());
    const admission = await admitPublicWorkflowRequest(
      repository.rateLimiter,
      privateUploadRateLimit,
      "payment-receipt-upload",
      actorUploadHash(actor.id),
    );
    if (admission) return noStoreJson({ message: admission.message }, admission.status);

    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      if (multipartRequestIsTooLarge(request)) {
        return noStoreJson({ message: "The payment-receipt upload exceeds the approved size limit." }, 413);
      }
      const form = await request.formData();
      const parsed = paymentReceiptRequestSchema.safeParse({
        phase: form.get("phase"),
        paymentId: form.get("paymentId"),
        intentId: form.get("intentId"),
      });
      const file = uploadFileFrom(form);
      if (!parsed.success || parsed.data.phase !== "upload" || parsed.data.paymentId !== paymentId || !file) {
        return noStoreJson({ message: "The payment-receipt upload is invalid." }, 400);
      }
      await requireOwnedUploadablePayment(actor.id, paymentId);
      const receipt = await completePaymentReceiptUpload({
        actorId: actor.id,
        paymentId,
        intentId: parsed.data.intentId,
        file,
      });
      return noStoreJson({ receipt }, 201);
    }

    const parsed = paymentReceiptRequestSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.paymentId !== paymentId || parsed.data.phase !== "prepare") {
      return noStoreJson({ message: "The payment-receipt request is invalid." }, 400);
    }
    await requireOwnedUploadablePayment(actor.id, paymentId);

    const upload = await preparePaymentReceiptUpload({
      actorId: actor.id,
      paymentId,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
    });
    return noStoreJson({ upload }, 201);
  } catch (error) {
    return safeRequestError(error);
  }
}
