import { describe, expect, it } from "vitest";

import {
  contactSubmissionSchema,
  isNewsletterUnsubscribeToken,
  newsletterSubmissionSchema,
  normalizePublicEmail,
} from "./validation";

describe("public workflow validation", () => {
  it("accepts bounded public contact and newsletter submissions", () => {
    expect(
      contactSubmissionSchema.safeParse({
        name: "Ada Supporter",
        email: "Ada@example.test",
        subject: "Membership question",
        message: "Please share the official membership process.",
        sourcePage: "/contact",
        turnstileToken: "token",
      }).success,
    ).toBe(true);
    expect(
      newsletterSubmissionSchema.safeParse({
        email: "member@example.test",
        sourcePage: "/",
        turnstileToken: "token",
      }).success,
    ).toBe(true);
    expect(normalizePublicEmail(" MEMBER@Example.test ")).toBe("member@example.test");
  });

  it("rejects extra fields, invalid paths, and control characters", () => {
    expect(
      contactSubmissionSchema.safeParse({
        name: "Ada\nSupporter",
        email: "ada@example.test",
        subject: "Question",
        message: "This message has enough content.",
        turnstileToken: "token",
      }).success,
    ).toBe(false);
    expect(
      newsletterSubmissionSchema.safeParse({
        email: "member@example.test",
        sourcePage: "https://untrusted.example.test",
        turnstileToken: "token",
        extra: "not accepted",
      }).success,
    ).toBe(false);
  });

  it("accepts only UUID newsletter preference bearer tokens", () => {
    expect(
      isNewsletterUnsubscribeToken("11111111-1111-4111-8111-111111111111"),
    ).toBe(true);
    expect(isNewsletterUnsubscribeToken("a".repeat(32))).toBe(false);
    expect(isNewsletterUnsubscribeToken("not-a-token")).toBe(false);
  });
});
