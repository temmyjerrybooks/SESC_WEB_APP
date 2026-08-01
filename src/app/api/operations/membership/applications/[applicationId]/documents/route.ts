import { z } from "zod";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { listApplicationDocumentsForReview } from "@/lib/server/review-evidence";

const idSchema = z.string().uuid();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string }> },
) {
  if (!isFeatureEnabled("membershipApplications")) {
    return unavailable("Membership review is not available in this environment.");
  }

  try {
    const { applicationId } = await context.params;
    if (!idSchema.safeParse(applicationId).success) {
      return noStoreJson({ message: "The requested application is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const documents = await listApplicationDocumentsForReview(actor, applicationId);
    return noStoreJson({ documents });
  } catch (error) {
    return safeRequestError(error);
  }
}
