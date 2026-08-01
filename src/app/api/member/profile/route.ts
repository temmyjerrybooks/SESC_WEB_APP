import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { updateOwnProfile } from "@/lib/server/administration-workflows";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { profileUpdateRequestSchema } from "@/lib/validation/server-workflows";

export async function PATCH(request: NextRequest) {
  if (!isFeatureEnabled("memberPortal")) {
    return unavailable("Profile updates are not available in this environment.");
  }
  try {
    const parsed = profileUpdateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStoreJson({ message: "The profile update is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    await updateOwnProfile(actor, parsed.data);
    return noStoreJson({ status: "updated" });
  } catch (error) {
    return safeRequestError(error);
  }
}
