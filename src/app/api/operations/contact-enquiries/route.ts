import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { updateContactEnquiry } from "@/lib/server/administration-workflows";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { contactEnquiryUpdateRequestSchema } from "@/lib/validation/server-workflows";

export async function PATCH(request: NextRequest) {
  if (!isFeatureEnabled("adminPortal")) {
    return unavailable("Contact management is not available in this environment.");
  }
  try {
    const parsed = contactEnquiryUpdateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStoreJson({ message: "The contact update is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    await updateContactEnquiry(actor, parsed.data);
    return noStoreJson({ status: "updated" });
  } catch (error) {
    return safeRequestError(error);
  }
}
