import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Contact delivery, approved support ownership, consent handling, and
 * retention controls are not configured. Reject before reading a request body
 * so the preview cannot receive or validate real contact information.
 */
export async function POST() {
  return NextResponse.json(
    { message: "The contact channel is not available until official delivery is configured." },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
