import { describe, expect, it } from "vitest";

import { evaluatePublicWorkflowConfiguration } from "./configuration";

const completeEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.example.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  NEXT_PUBLIC_SITE_URL: "https://sesc.example.test",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key",
  SESC_PREVIEW_SAFE_MODE: "false",
  SESC_CONTACT_RETENTION_READY: "true",
  SESC_RATE_LIMITING_READY: "true",
  SESC_TRUSTED_PROXY_HEADERS: "true",
  SESC_PUBLIC_FORMS_RATE_LIMIT_MAX_ATTEMPTS: "3",
  SESC_PUBLIC_FORMS_RATE_LIMIT_WINDOW_SECONDS: "60",
  SESC_DATABASE_MIGRATIONS_READY: "true",
  SESC_ROW_LEVEL_SECURITY_READY: "true",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  TURNSTILE_SECRET_KEY: "turnstile-secret",
  BREVO_API_KEY: "brevo-key",
  BREVO_SENDER_ADDRESS: "notices@example.test",
  BREVO_SENDER_NAME: "SESC Nigeria",
  SESC_CONTACT_RECIPIENT: "support@example.test",
} as const;

const upstreamEnabled = {
  contactEnquiriesEnabled: true,
  emailDeliveryEnabled: true,
  newsletterSubscriptionsEnabled: true,
};

describe("public workflow configuration", () => {
  it("fails closed before every explicit prerequisite exists", () => {
    const configuration = evaluatePublicWorkflowConfiguration({}, upstreamEnabled);

    expect(configuration.contact.enabled).toBe(false);
    expect(configuration.newsletter.enabled).toBe(false);
    expect(configuration.rateLimit).toBeUndefined();
    expect(configuration.brevo).toBeUndefined();
  });

  it("enables each route only with full server-side configuration", () => {
    const configuration = evaluatePublicWorkflowConfiguration(
      completeEnvironment,
      upstreamEnabled,
    );

    expect(configuration.contact).toEqual({
      enabled: true,
      recipient: "support@example.test",
    });
    expect(configuration.newsletter).toEqual({
      enabled: true,
      confirmationBaseUrl: "https://sesc.example.test/newsletter/confirm",
      unsubscribeBaseUrl: "https://sesc.example.test/newsletter/unsubscribe",
      preferenceManagementEnabled: true,
    });
    expect(configuration.rateLimit).toEqual({ maxAttempts: 3, windowSeconds: 60 });
    expect(configuration.turnstileExpectedHostname).toBe("sesc.example.test");
  });

  it("does not let flags bypass preview safety, upstream gates, or retention", () => {
    expect(
      evaluatePublicWorkflowConfiguration(
        { ...completeEnvironment, SESC_PREVIEW_SAFE_MODE: "true" },
        upstreamEnabled,
      ).contact.enabled,
    ).toBe(false);
    expect(
      evaluatePublicWorkflowConfiguration(
        { ...completeEnvironment, SESC_CONTACT_RETENTION_READY: "false" },
        upstreamEnabled,
      ).contact.enabled,
    ).toBe(false);
    expect(
      evaluatePublicWorkflowConfiguration(completeEnvironment, {
        contactEnquiriesEnabled: false,
        emailDeliveryEnabled: false,
        newsletterSubscriptionsEnabled: false,
      }).newsletter.enabled,
    ).toBe(false);
  });

  it("keeps preference management available while new subscriptions are paused", () => {
    const configuration = evaluatePublicWorkflowConfiguration(
      {
        ...completeEnvironment,
        SESC_PREVIEW_SAFE_MODE: "true",
        SESC_TRUSTED_PROXY_HEADERS: "false",
        BREVO_API_KEY: undefined,
      },
      {
        ...upstreamEnabled,
        newsletterSubscriptionsEnabled: false,
      },
    );

    expect(configuration.newsletter.enabled).toBe(false);
    expect(configuration.newsletter.preferenceManagementEnabled).toBe(true);
  });
});
