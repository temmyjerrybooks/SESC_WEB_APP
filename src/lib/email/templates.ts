export const transactionalEmailKinds = [
  "email_verification_support",
  "welcome",
  "application_received",
  "application_correction_required",
  "application_approved",
  "application_rejected",
  "payment_receipt_received",
  "payment_correction_required",
  "payment_approved",
  "payment_rejected",
  "membership_activated",
  "membership_expiring",
  "password_reset_support",
  "executive_invitation",
  "administrator_notification",
  "newsletter_confirmation",
  "unsubscribe_confirmation",
] as const;

export type TransactionalEmailKind = (typeof transactionalEmailKinds)[number];

export type TransactionalEmail = {
  subject: string;
  html: string;
  text: string;
};

const copy: Record<TransactionalEmailKind, { heading: string; summary: string }> = {
  email_verification_support: { heading: "Email verification", summary: "Please follow the secure verification instructions provided by SESC." },
  welcome: { heading: "Welcome to SESC", summary: "Your account has been created. Membership services remain subject to approval." },
  application_received: { heading: "Application received", summary: "Your application has been received for authorised review." },
  application_correction_required: { heading: "Application update required", summary: "A reviewer has requested a correction through the secure portal." },
  application_approved: { heading: "Application update", summary: "Your application has an authorised status update in the secure portal." },
  application_rejected: { heading: "Application update", summary: "Your application has an authorised status update in the secure portal." },
  payment_receipt_received: { heading: "Payment receipt received", summary: "Your receipt is queued for authorised verification." },
  payment_correction_required: { heading: "Payment update required", summary: "A corrected receipt is required through the secure portal." },
  payment_approved: { heading: "Payment update", summary: "Your payment has an authorised status update in the secure portal." },
  payment_rejected: { heading: "Payment update", summary: "Your payment has an authorised status update in the secure portal." },
  membership_activated: { heading: "Membership activated", summary: "Your membership is active. Open the secure portal to view your details." },
  membership_expiring: { heading: "Membership reminder", summary: "Your membership has an upcoming renewal date. Review your secure portal for details." },
  password_reset_support: { heading: "Password reset support", summary: "Use only the secure reset link you requested. SESC will never ask for your password." },
  executive_invitation: { heading: "SESC invitation", summary: "You have an invitation to a protected SESC role. Complete it only if you expected this message." },
  administrator_notification: { heading: "Administrative review requested", summary: "A protected SESC workflow requires authorised administrative review." },
  newsletter_confirmation: { heading: "Confirm your newsletter subscription", summary: "Confirm your email preference using the secure link provided by SESC." },
  unsubscribe_confirmation: { heading: "Newsletter preference updated", summary: "Your newsletter preference update has been recorded." },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function secureActionUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Generates a small, fully escaped HTML email without importing React server
 * rendering into the Next.js route bundle.
 */
export function renderTransactionalEmail(
  kind: TransactionalEmailKind,
  actionUrl?: string,
  unsubscribeUrl?: string,
): TransactionalEmail {
  const content = copy[kind];
  const safeActionUrl = secureActionUrl(actionUrl);
  const safeUnsubscribeUrl = kind === "newsletter_confirmation"
    ? secureActionUrl(unsubscribeUrl)
    : undefined;
  const action = safeActionUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(safeActionUrl)}" style="background:#008751;border-radius:8px;color:#ffffff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Open secure SESC service</a></p>`
    : "";
  const unsubscribeAction = safeUnsubscribeUrl
    ? `<p style="color:#526458;font-size:13px;line-height:1.6;margin:20px 0 0">If you did not request these updates, <a href="${escapeHtml(safeUnsubscribeUrl)}">cancel this request and unsubscribe securely</a>.</p>`
    : "";
  const html = `<!doctype html><html><body style="background:#f4f7f4;color:#102116;font-family:Arial,sans-serif;margin:0;padding:24px"><main style="background:#ffffff;border-radius:12px;margin:0 auto;max-width:600px;overflow:hidden"><header style="background:#008751;color:#ffffff;padding:24px 28px"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;margin:0;text-transform:uppercase">SESC Nigeria</p><h1 style="font-size:24px;line-height:1.25;margin:8px 0 0">${escapeHtml(content.heading)}</h1></header><section style="padding:28px"><p style="font-size:16px;line-height:1.6;margin:0">${escapeHtml(content.summary)}</p>${action}${unsubscribeAction}</section><footer style="border-top:1px solid #dce7df;color:#526458;font-size:12px;padding:20px 28px">Super Eagles Supporters Club of Nigeria</footer></main></body></html>`;

  return {
    subject: "Update from Super Eagles Supporters Club",
    html,
    text: `${content.heading}\n\n${content.summary}${safeActionUrl ? `\n\n${safeActionUrl}` : ""}${safeUnsubscribeUrl ? `\n\nTo cancel this request or stop future updates: ${safeUnsubscribeUrl}` : ""}`,
  };
}
