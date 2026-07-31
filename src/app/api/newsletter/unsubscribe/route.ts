import {
  unsubscribeNewsletter,
  type PublicWorkflowOutcome,
} from "@/lib/public-workflows/handlers";
import { readBoundedJson } from "@/lib/public-workflows/request-body";
import { getNewsletterUnsubscribeRuntime } from "@/lib/public-workflows/runtime";
import { noStoreJson, unavailable } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function respond(outcome: PublicWorkflowOutcome) {
  return noStoreJson({ message: outcome.message }, outcome.status);
}

/**
 * The token is supplied only after the browser removes it from the URL
 * fragment and a visitor explicitly confirms their preference. No result here
 * distinguishes a valid recipient from a replayed, unknown, or malformed
 * token.
 */
export async function POST(request: Request) {
  const runtime = getNewsletterUnsubscribeRuntime();
  if (!runtime) {
    return unavailable("Newsletter preference management is temporarily unavailable.");
  }

  const body = await readBoundedJson(request, 1_024);
  const token = body.status === "parsed" &&
    body.value &&
    typeof body.value === "object" &&
    !Array.isArray(body.value)
      ? (body.value as { token?: unknown }).token
      : undefined;
  return respond(
    await unsubscribeNewsletter(token, runtime),
  );
}
