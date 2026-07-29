import { describe, expect, it } from "vitest";

import {
  createPublicReadiness,
  evaluateFeatureGates,
} from "./gates";
import { readPublicEnvironment } from "./public";

const fullyConfiguredEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.example.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  NEXT_PUBLIC_SITE_URL: "https://sesc.example.test",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-site-key",
  SESC_PREVIEW_SAFE_MODE: "false",
  SESC_AUTHENTICATION_ENABLED: "true",
  SESC_MEMBERSHIP_APPLICATIONS_ENABLED: "true",
  SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED: "true",
  SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED: "true",
  SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED: "true",
  SESC_EMAIL_DELIVERY_ENABLED: "true",
  SESC_MEMBER_PORTAL_ENABLED: "true",
  SESC_EXECUTIVE_PORTAL_ENABLED: "true",
  SESC_ADMIN_PORTAL_ENABLED: "true",
  SESC_DATABASE_MIGRATIONS_READY: "true",
  SESC_ROW_LEVEL_SECURITY_READY: "true",
  SESC_PRIVATE_STORAGE_READY: "true",
  SESC_NEWSLETTER_ABUSE_PROTECTION_READY: "true",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  TURNSTILE_SECRET_KEY: "test-turnstile-secret",
  BREVO_API_KEY: "test-brevo-api-key",
  BREVO_SENDER_ADDRESS: "noreply@example.test",
  BREVO_SENDER_NAME: "SESC",
} as const;

describe("public environment validation", () => {
  it("accepts complete browser-safe Supabase configuration", () => {
    const environment = readPublicEnvironment({
      ...fullyConfiguredEnvironment,
      NEXT_PUBLIC_AUTH_ACTIONS_ENABLED: "true",
    });

    expect(environment.supabase).toEqual({
      url: "https://project.example.test",
      anonKey: "test-anon-key",
    });
    expect(environment.authActionsEnabled).toBe(true);
  });

  it("fails closed for malformed public values", () => {
    const environment = readPublicEnvironment({
      NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_AUTH_ACTIONS_ENABLED: "yes",
    });

    expect(environment.supabase).toBeNull();
    expect(environment.authActionsEnabled).toBe(false);
  });
});

describe("server feature gates", () => {
  it("keeps every sensitive workflow unavailable by default", () => {
    const gates = evaluateFeatureGates({});

    expect(Object.values(gates).every((gate) => !gate.enabled)).toBe(true);
    expect(gates.authentication.missing).toContain("preview-safe-mode");
    expect(gates.newsletterSubscriptions.missing).toContain(
      "newsletter-abuse-protection",
    );
  });

  it("enables a workflow only when every explicit prerequisite is present", () => {
    const gates = evaluateFeatureGates(fullyConfiguredEnvironment);

    expect(Object.values(gates).every((gate) => gate.enabled)).toBe(true);
  });

  it("does not allow feature flags to bypass preview-safe mode", () => {
    const gates = evaluateFeatureGates({
      ...fullyConfiguredEnvironment,
      SESC_PREVIEW_SAFE_MODE: "true",
    });

    expect(Object.values(gates).every((gate) => !gate.enabled)).toBe(true);
    expect(gates.memberPortal.missing).toContain("preview-safe-mode");
  });

  it("keeps document, membership, and payment workflows off without server-only storage controls", () => {
    const gates = evaluateFeatureGates({
      ...fullyConfiguredEnvironment,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      SESC_PRIVATE_STORAGE_READY: "false",
    });

    expect(gates.privateDocumentUploads.enabled).toBe(false);
    expect(gates.membershipApplications.enabled).toBe(false);
    expect(gates.manualPaymentVerification.enabled).toBe(false);
    expect(gates.privateDocumentUploads.missing).toEqual(
      expect.arrayContaining(["supabase-service-role", "private-storage"]),
    );
  });

  it("reports only availability states in health readiness", () => {
    const readiness = createPublicReadiness({
      ...fullyConfiguredEnvironment,
      BREVO_SENDER_ADDRESS: "invalid-email",
    });

    expect(readiness.emailDelivery).toBe("unavailable");
    expect(readiness.newsletterSubscriptions).toBe("unavailable");
    expect(Object.values(readiness)).toEqual(
      expect.arrayContaining(["available", "unavailable"]),
    );
  });
});
