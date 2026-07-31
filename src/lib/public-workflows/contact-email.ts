import type { ContactSubmission } from "./validation";

export type RenderedContactEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normaliseMultiline(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

/**
 * Contact copy is rendered server-side and escapes every visitor-provided
 * field. The email subject is fixed so a contact subject cannot influence
 * provider metadata or downstream mailbox rules.
 */
export function renderContactDeliveryEmail(
  submission: Pick<
    ContactSubmission,
    "name" | "email" | "subject" | "message" | "sourcePage"
  >,
): RenderedContactEmail {
  const message = normaliseMultiline(submission.message);
  const sourcePage = submission.sourcePage ?? "Not supplied";
  const text = [
    "New SESC public contact request",
    "",
    `Name: ${submission.name}`,
    `Email: ${submission.email}`,
    `Subject: ${submission.subject}`,
    `Source page: ${sourcePage}`,
    "",
    "Message:",
    message,
  ].join("\n");

  return {
    subject: "New public contact request | SESC Nigeria",
    text,
    html: `<!doctype html><html><body style="background:#f4f7f4;color:#102116;font-family:Arial,sans-serif;margin:0;padding:24px"><main style="background:#ffffff;border-radius:12px;margin:0 auto;max-width:640px;padding:28px"><h1 style="font-size:22px;margin-top:0">New SESC public contact request</h1><dl><dt><strong>Name</strong></dt><dd>${escapeHtml(submission.name)}</dd><dt><strong>Email</strong></dt><dd>${escapeHtml(submission.email)}</dd><dt><strong>Subject</strong></dt><dd>${escapeHtml(submission.subject)}</dd><dt><strong>Source page</strong></dt><dd>${escapeHtml(sourcePage)}</dd></dl><h2 style="font-size:18px">Message</h2><p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(message)}</p></main></body></html>`,
  };
}
