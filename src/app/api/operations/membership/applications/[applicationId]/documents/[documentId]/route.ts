import { z } from "zod";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { prepareApplicationDocumentReview } from "@/lib/server/review-evidence";

const idSchema = z.string().uuid();

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ applicationId: string; documentId: string }> },
) {
  if (!isFeatureEnabled("membershipApplications")) {
    return unavailable("Membership review is not available in this environment.");
  }

  try {
    const { applicationId, documentId } = await context.params;
    if (!idSchema.safeParse(applicationId).success || !idSchema.safeParse(documentId).success) {
      return noStoreJson({ message: "The requested document is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const review = await prepareApplicationDocumentReview(actor, applicationId, documentId);
    return noStoreJson({ review });
  } catch (error) {
    return safeRequestError(error);
  }
}
