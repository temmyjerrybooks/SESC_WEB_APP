import "server-only";

import { NextResponse } from "next/server";

import { RequestAccessError } from "./actor";

export function noStoreJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function unavailable(message = "This service is not available in the current environment.") {
  return noStoreJson({ message }, 503);
}

/**
 * Converts expected request failures into safe client messages. Provider and
 * database diagnostics are deliberately not forwarded to the browser.
 */
export function safeRequestError(error: unknown) {
  if (error instanceof RequestAccessError) {
    return noStoreJson({ message: error.message }, error.status);
  }

  return noStoreJson(
    { message: "We could not complete that request. Please try again later." },
    500,
  );
}
