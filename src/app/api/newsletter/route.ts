import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Mailing-list delivery, consent records, and an unsubscribe mechanism have
 * not been configured. Reject before reading submitted email data so this
 * route cannot create a misleading development subscription.
 */
export async function POST() {
  return NextResponse.json(
    { message: "Newsletter enrolment is not available until official mailing delivery is configured." },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
