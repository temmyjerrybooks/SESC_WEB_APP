import { z } from "zod";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { preparePaymentReceiptReview } from "@/lib/server/review-evidence";

const idSchema = z.string().uuid();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  if (!isFeatureEnabled("manualPaymentVerification")) {
    return unavailable("Manual payment review is not available in this environment.");
  }

  try {
    const { paymentId } = await context.params;
    if (!idSchema.safeParse(paymentId).success) {
      return noStoreJson({ message: "The requested receipt is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const review = await preparePaymentReceiptReview(actor, paymentId);
    return noStoreJson({ review });
  } catch (error) {
    return safeRequestError(error);
  }
}
