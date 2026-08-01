import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { reviewManualPayment } from "@/lib/server/membership-workflows";
import { paymentReviewRequestSchema } from "@/lib/validation/server-workflows";

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled("manualPaymentVerification")) {
    return unavailable("Manual payment review is not available in this environment.");
  }

  try {
    const parsed = paymentReviewRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStoreJson({ message: "The payment review request is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const status = await reviewManualPayment(
      actor,
      parsed.data.paymentId,
      parsed.data.decision,
      parsed.data.notes,
    );
    return noStoreJson({ status });
  } catch (error) {
    return safeRequestError(error);
  }
}
