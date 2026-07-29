import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";

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

function EmailFrame({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <main style={{ background: "#f4f7f4", color: "#102116", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px" }}>
      <section style={{ background: "#ffffff", borderRadius: "12px", margin: "0 auto", maxWidth: "600px", overflow: "hidden" }}>
        <header style={{ background: "#008751", color: "#ffffff", padding: "24px 28px" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.12em", margin: 0, textTransform: "uppercase" }}>SESC Nigeria</p>
          <h1 style={{ fontSize: "24px", lineHeight: 1.25, margin: "8px 0 0" }}>{heading}</h1>
        </header>
        <div style={{ padding: "28px" }}>{children}</div>
        <footer style={{ borderTop: "1px solid #dce7df", color: "#526458", fontSize: "12px", padding: "20px 28px" }}>
          Super Eagles Supporters Club of Nigeria
        </footer>
      </section>
    </main>
  );
}

export function renderTransactionalEmail(kind: TransactionalEmailKind, actionUrl?: string): TransactionalEmail {
  const content = copy[kind];
  const safeActionUrl = actionUrl?.startsWith("https://") ? actionUrl : undefined;
  const html = "<!doctype html>" + renderToStaticMarkup(
    <EmailFrame heading={content.heading}>
      <p style={{ fontSize: "16px", lineHeight: 1.6, margin: 0 }}>{content.summary}</p>
      {safeActionUrl ? (
        <p style={{ margin: "24px 0 0" }}>
          <a href={safeActionUrl} style={{ background: "#008751", borderRadius: "8px", color: "#ffffff", display: "inline-block", fontWeight: 700, padding: "12px 18px", textDecoration: "none" }}>
            Open secure SESC service
          </a>
        </p>
      ) : null}
    </EmailFrame>,
  );

  return {
    subject: "Update from Super Eagles Supporters Club",
    html,
    text: `${content.heading}\n\n${content.summary}${safeActionUrl ? `\n\n${safeActionUrl}` : ""}`,
  };
}
