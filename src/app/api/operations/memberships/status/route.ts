import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { setMembershipStatus } from "@/lib/server/membership-workflows";
import { membershipStatusRequestSchema } from "@/lib/validation/server-workflows";

export async function POST(request: NextRequest) {
  if (!isFeatureEnabled("adminPortal")) {
    return unavailable("Membership administration is not available in this environment.");
  }

  try {
    const parsed = membershipStatusRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStoreJson({ message: "The membership-status request is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const status = await setMembershipStatus(
      actor,
      parsed.data.membershipId,
      parsed.data.status,
      parsed.data.reason,
    );
    return noStoreJson({ status });
  } catch (error) {
    return safeRequestError(error);
  }
}
