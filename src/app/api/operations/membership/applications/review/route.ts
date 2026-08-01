import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { reviewMembershipApplication } from "@/lib/server/membership-workflows";
import { applicationReviewRequestSchema } from "@/lib/validation/server-workflows";

function operationsUnavailable() {
  return unavailable("Authorised application review is not available in this environment.");
}

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled("executivePortal") && !isFeatureEnabled("adminPortal")) {
    return operationsUnavailable();
  }

  try {
    const parsed = applicationReviewRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStoreJson({ message: "The review request is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const status = await reviewMembershipApplication(
      actor,
      parsed.data.applicationId,
      parsed.data.decision,
      parsed.data.notes,
    );
    return noStoreJson({ status });
  } catch (error) {
    return safeRequestError(error);
  }
}
