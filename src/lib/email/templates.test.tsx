import { describe, expect, it } from "vitest";

import { renderTransactionalEmail } from "./templates";

describe("transactional email templates", () => {
  it("renders club branding with a plain-text fallback", () => {
    const email = renderTransactionalEmail("application_received", "https://app.example.test/member");

    expect(email.subject).not.toMatch(/identity|payment receipt|password/i);
    expect(email.html).toContain("SESC Nigeria");
    expect(email.html).toContain("Open secure SESC service");
    expect(email.text).toContain("Application received");
  });

  it("does not place non-HTTPS action URLs into an email", () => {
    const email = renderTransactionalEmail("password_reset_support", "javascript:alert(1)");

    expect(email.html).not.toContain("javascript:");
    expect(email.text).not.toContain("javascript:");
  });

  it("includes a secure fragment-only unsubscribe link in newsletter confirmation mail", () => {
    const confirmationUrl = "https://sesc.example.test/newsletter/confirm?token=11111111-1111-4111-8111-111111111111";
    const unsubscribeUrl = "https://sesc.example.test/newsletter/unsubscribe#token=22222222-2222-4222-8222-222222222222";
    const email = renderTransactionalEmail(
      "newsletter_confirmation",
      confirmationUrl,
      unsubscribeUrl,
    );

    expect(email.html).toContain(unsubscribeUrl);
    expect(email.text).toContain(unsubscribeUrl);
    expect(email.html).toContain("unsubscribe securely");

    const rejected = renderTransactionalEmail(
      "newsletter_confirmation",
      confirmationUrl,
      "http://sesc.example.test/newsletter/unsubscribe#token=22222222-2222-4222-8222-222222222222",
    );
    expect(rejected.html).not.toContain("newsletter/unsubscribe");
    expect(rejected.text).not.toContain("newsletter/unsubscribe");
  });
});
