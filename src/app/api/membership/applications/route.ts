import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function unavailable() {
  return NextResponse.json(
    {
      message:
        "Membership applications are not open yet. This preview does not accept or retain personal, payment, or identity information.",
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

/**
 * Intentionally rejects requests before reading a body. A real submission
 * handler may replace this only after authenticated Supabase persistence,
 * private object storage, reviewer access controls, payment review, retention
 * controls, and approved notifications are connected and tested together.
 */
export async function POST() {
  return unavailable();
}
