import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isFeatureEnabled("manualPaymentVerification")) {
    return unavailable("Manual payment review is not available in this environment.");
  }

  try {
    await requireVerifiedActor();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("finance_payment_queue", {
      requested_status: "pending_verification",
      maximum_rows: 25,
    });
    if (error || !Array.isArray(data)) {
      return unavailable("The protected payment queue is temporarily unavailable.");
    }

    const payments = data.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      if (
        typeof row.payment_id !== "string" ||
        typeof row.payment_reference !== "string" ||
        typeof row.application_reference !== "string" ||
        typeof row.amount_minor !== "number" ||
        typeof row.currency !== "string" ||
        typeof row.payment_status !== "string"
      ) return [];
      return [{
        paymentId: row.payment_id,
        paymentReference: row.payment_reference,
        applicationReference: row.application_reference,
        amountMinor: row.amount_minor,
        currency: row.currency,
        status: row.payment_status,
        receiptReceived: row.receipt_received === true,
        submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
      }];
    });
    return noStoreJson({ payments });
  } catch (error) {
    return safeRequestError(error);
  }
}
