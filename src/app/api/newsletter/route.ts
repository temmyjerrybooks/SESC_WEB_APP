import { NextResponse } from "next/server";

import {
  admitPublicWorkflowRequest,
  publicWorkflowMessages,
  submitNewsletterSubscription,
  type PublicWorkflowOutcome,
} from "@/lib/public-workflows/handlers";
import { readBoundedJson } from "@/lib/public-workflows/request-body";
import { getNewsletterWorkflowRuntime } from "@/lib/public-workflows/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function respond(outcome: PublicWorkflowOutcome) {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (outcome.retryAfterSeconds) {
    headers["Retry-After"] = String(outcome.retryAfterSeconds);
  }

  return NextResponse.json({ message: outcome.message }, {
    status: outcome.status,
    headers,
  });
}

/**
 * A subscription is persisted and double-opt-in mail is sent only after all
 * server-held production gates, a durable rate limit, and Turnstile pass.
 */
export async function POST(request: Request) {
  const runtime = getNewsletterWorkflowRuntime(request);
  if (!runtime) {
    return respond({
      status: 503,
      message: publicWorkflowMessages.unavailable,
    });
  }

  const admission = await admitPublicWorkflowRequest(
    runtime.repository.rateLimiter,
    runtime.rateLimit,
    "newsletter",
    runtime.sourceIpHash,
  );
  if (admission) return respond(admission);

  const body = await readBoundedJson(request, 8_192);
  if (body.status !== "parsed") {
    return respond({ status: 400, message: publicWorkflowMessages.invalid });
  }

  return respond(await submitNewsletterSubscription(body.value, runtime));
}
