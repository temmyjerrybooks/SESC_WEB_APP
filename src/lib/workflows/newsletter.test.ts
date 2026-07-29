import { describe, expect, it } from "vitest";

import {
  isValidUnsubscribeToken,
  newsletterSubscriptionSchema,
  normalizeNewsletterEmail,
} from "./newsletter";

describe("newsletter validation", () => {
  it("normalizes and validates a subscription address", () => {
    expect(normalizeNewsletterEmail("  MEMBER@Example.TEST ")).toBe("member@example.test");
    expect(newsletterSubscriptionSchema.safeParse({ email: "member@example.test", sourcePage: "/" }).success).toBe(true);
  });

  it("rejects invalid addresses and unsafe unsubscribe tokens", () => {
    expect(newsletterSubscriptionSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(isValidUnsubscribeToken("short")).toBe(false);
    expect(isValidUnsubscribeToken("a".repeat(32))).toBe(true);
  });
});
