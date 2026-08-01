import { describe, expect, it } from "vitest";

import { readApplicationEnvironment } from "./application";

describe("application environment validation", () => {
  it("exposes availability without exposing secret values", () => {
    const environment = readApplicationEnvironment({
      NEXT_PUBLIC_SITE_URL: "https://sesc.example.test",
      SUPABASE_DB_URL: "postgresql://example.test/database",
      SUPABASE_MEMBER_PRIVATE_BUCKET: "member-private",
      SUPABASE_PAYMENT_RECEIPTS_BUCKET: "payment-receipts",
      SUPABASE_MEMBERSHIP_DOCUMENTS_BUCKET: "membership-documents",
      TURNSTILE_SECRET_KEY: "secret",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
      SENTRY_DSN: "https://public@example.test/1",
      SESC_CONTACT_RECIPIENT: "support@example.test",
      SESC_SPONSORSHIP_CONTACT: "partners@example.test",
      NEXT_PUBLIC_FIREBASE_API_KEY: "api",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
    });

    expect(environment).toMatchObject({
      siteUrl: "https://sesc.example.test",
      databaseUrlConfigured: true,
      turnstileConfigured: true,
      sentryConfigured: true,
      firebaseWebPushConfigured: true,
    });
    expect(Object.values(environment)).not.toContain("secret");
  });

  it("fails closed for malformed optional values", () => {
    const environment = readApplicationEnvironment({
      NEXT_PUBLIC_SITE_URL: "not-a-url",
      SUPABASE_MEMBER_PRIVATE_BUCKET: "INVALID_BUCKET",
      SESC_CONTACT_RECIPIENT: "not-an-email",
    });

    expect(environment.siteUrl).toBeUndefined();
    expect(environment.storageBuckets.memberPrivate).toBeUndefined();
    expect(environment.contactRecipient).toBeUndefined();
  });
});
