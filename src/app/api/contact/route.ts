import { NextResponse } from "next/server";

import {
  admitPublicWorkflowRequest,
  publicWorkflowMessages,
  submitContactEnquiry,
  type PublicWorkflowOutcome,
} from "@/lib/public-workflows/handlers";
import { readBoundedJson } from "@/lib/public-workflows/request-body";
import { getContactWorkflowRuntime } from "@/lib/public-workflows/runtime";

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
 * The runtime is deliberately assembled before the request body is read.
 * Contact data is accepted only after every production prerequisite, durable
 * rate limit, and Turnstile verification is available.
 */
export async function POST(request: Request) {
  const runtime = getContactWorkflowRuntime(request);
  if (!runtime) {
    return respond({
      status: 503,
      message: publicWorkflowMessages.unavailable,
    });
  }

  const admission = await admitPublicWorkflowRequest(
    runtime.repository.rateLimiter,
    runtime.rateLimit,
    "contact",
    runtime.sourceIpHash,
  );
  if (admission) return respond(admission);

  const body = await readBoundedJson(request, 16_384);
  if (body.status !== "parsed") {
    return respond({ status: 400, message: publicWorkflowMessages.invalid });
  }

  return respond(await submitContactEnquiry(body.value, runtime));
}
