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
});
