import { z } from "zod";

import {
  readPublicEnvironment,
  trustedHttpsSiteOrigin,
  type EnvironmentInput,
} from "@/lib/environment/public";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalBooleanFlag = z.preprocess(
  blankToUndefined,
  z.enum(["true", "false"]).optional().catch(undefined),
);

const optionalNonEmptyString = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional().catch(undefined),
);

const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email().optional().catch(undefined),
);

const optionalBoundedAttempts = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(1).max(30).optional().catch(undefined),
);

const optionalBoundedWindow = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(1).max(86_400).optional().catch(undefined),
);

export const publicWorkflowEnvironmentSchema = z.object({
  SESC_PREVIEW_SAFE_MODE: optionalBooleanFlag,
  SESC_CONTACT_RETENTION_READY: optionalBooleanFlag,
  SESC_RATE_LIMITING_READY: optionalBooleanFlag,
  SESC_TRUSTED_PROXY_HEADERS: optionalBooleanFlag,
  SESC_PUBLIC_FORMS_RATE_LIMIT_MAX_ATTEMPTS: optionalBoundedAttempts,
  SESC_PUBLIC_FORMS_RATE_LIMIT_WINDOW_SECONDS: optionalBoundedWindow,
  SESC_DATABASE_MIGRATIONS_READY: optionalBooleanFlag,
  SESC_ROW_LEVEL_SECURITY_READY: optionalBooleanFlag,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  TURNSTILE_SECRET_KEY: optionalNonEmptyString,
  BREVO_API_KEY: optionalNonEmptyString,
  BREVO_SENDER_ADDRESS: optionalEmail,
  BREVO_SENDER_NAME: optionalNonEmptyString,
  SESC_CONTACT_RECIPIENT: optionalEmail,
});

export type UpstreamWorkflowAvailability = {
  contactEnquiriesEnabled: boolean;
  emailDeliveryEnabled: boolean;
  newsletterSubscriptionsEnabled: boolean;
};

export type PublicFormRateLimitSettings = {
  maxAttempts: number;
  windowSeconds: number;
};

export type PublicWorkflowConfiguration = {
  contact: {
    enabled: boolean;
    recipient?: string;
  };
  newsletter: {
    enabled: boolean;
    confirmationBaseUrl?: string;
    unsubscribeBaseUrl?: string;
    preferenceManagementEnabled: boolean;
  };
  rateLimit?: PublicFormRateLimitSettings;
  turnstileSecret?: string;
  turnstileExpectedHostname?: string;
  brevo?: {
    apiKey: string;
    senderEmail: string;
    senderName: string;
  };
};

/**
 * Evaluates only explicit, server-controlled prerequisites. The resulting
 * object must be consumed from server-only runtime code; it intentionally
 * keeps public forms off if one of the provider, persistence, consent,
 * anti-abuse, or retention prerequisites is absent.
 */
export function evaluatePublicWorkflowConfiguration(
  environment: EnvironmentInput,
  upstream: UpstreamWorkflowAvailability,
): PublicWorkflowConfiguration {
  const parsed = publicWorkflowEnvironmentSchema.parse({
    SESC_PREVIEW_SAFE_MODE: environment.SESC_PREVIEW_SAFE_MODE,
    SESC_CONTACT_RETENTION_READY: environment.SESC_CONTACT_RETENTION_READY,
    SESC_RATE_LIMITING_READY: environment.SESC_RATE_LIMITING_READY,
    SESC_TRUSTED_PROXY_HEADERS: environment.SESC_TRUSTED_PROXY_HEADERS,
    SESC_PUBLIC_FORMS_RATE_LIMIT_MAX_ATTEMPTS:
      environment.SESC_PUBLIC_FORMS_RATE_LIMIT_MAX_ATTEMPTS,
    SESC_PUBLIC_FORMS_RATE_LIMIT_WINDOW_SECONDS:
      environment.SESC_PUBLIC_FORMS_RATE_LIMIT_WINDOW_SECONDS,
    SESC_DATABASE_MIGRATIONS_READY:
      environment.SESC_DATABASE_MIGRATIONS_READY,
    SESC_ROW_LEVEL_SECURITY_READY:
      environment.SESC_ROW_LEVEL_SECURITY_READY,
    SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SERVICE_ROLE_KEY,
    TURNSTILE_SECRET_KEY: environment.TURNSTILE_SECRET_KEY,
    BREVO_API_KEY: environment.BREVO_API_KEY,
    BREVO_SENDER_ADDRESS: environment.BREVO_SENDER_ADDRESS,
    BREVO_SENDER_NAME: environment.BREVO_SENDER_NAME,
    SESC_CONTACT_RECIPIENT: environment.SESC_CONTACT_RECIPIENT,
  });
  const publicEnvironment = readPublicEnvironment(environment);
  const secureSiteUrl = trustedHttpsSiteOrigin(publicEnvironment.siteUrl);
  const previewSafeMode = parsed.SESC_PREVIEW_SAFE_MODE !== "false";
  const rateLimit =
    parsed.SESC_RATE_LIMITING_READY === "true" &&
    parsed.SESC_PUBLIC_FORMS_RATE_LIMIT_MAX_ATTEMPTS &&
    parsed.SESC_PUBLIC_FORMS_RATE_LIMIT_WINDOW_SECONDS
      ? {
          maxAttempts: parsed.SESC_PUBLIC_FORMS_RATE_LIMIT_MAX_ATTEMPTS,
          windowSeconds: parsed.SESC_PUBLIC_FORMS_RATE_LIMIT_WINDOW_SECONDS,
        }
      : undefined;
  const brevo =
    parsed.BREVO_API_KEY &&
    parsed.BREVO_SENDER_ADDRESS &&
    parsed.BREVO_SENDER_NAME
      ? {
          apiKey: parsed.BREVO_API_KEY,
          senderEmail: parsed.BREVO_SENDER_ADDRESS,
          senderName: parsed.BREVO_SENDER_NAME,
        }
      : undefined;
  const sharedServerRequirements = Boolean(
    !previewSafeMode &&
      publicEnvironment.supabase &&
      parsed.SUPABASE_SERVICE_ROLE_KEY &&
      parsed.SESC_DATABASE_MIGRATIONS_READY === "true" &&
      parsed.SESC_ROW_LEVEL_SECURITY_READY === "true" &&
      publicEnvironment.turnstileSiteKey &&
      parsed.TURNSTILE_SECRET_KEY &&
      parsed.SESC_TRUSTED_PROXY_HEADERS === "true" &&
      secureSiteUrl &&
      rateLimit &&
      brevo,
  );
  // Preference management intentionally stays independent from new
  // subscriptions. A recipient must be able to opt out while delivery,
  // Turnstile, or preview-safe controls have paused new sign-ups.
  const newsletterPreferenceManagementEnabled = Boolean(
    publicEnvironment.supabase &&
      parsed.SUPABASE_SERVICE_ROLE_KEY &&
      parsed.SESC_DATABASE_MIGRATIONS_READY === "true" &&
      parsed.SESC_ROW_LEVEL_SECURITY_READY === "true",
  );
  const contactEnabled = Boolean(
    sharedServerRequirements &&
      upstream.contactEnquiriesEnabled &&
      upstream.emailDeliveryEnabled &&
      parsed.SESC_CONTACT_RETENTION_READY === "true" &&
      parsed.SESC_CONTACT_RECIPIENT,
  );
  const newsletterEnabled = Boolean(
    sharedServerRequirements &&
      upstream.newsletterSubscriptionsEnabled &&
      secureSiteUrl,
  );

  return {
    contact: {
      enabled: contactEnabled,
      recipient: contactEnabled ? parsed.SESC_CONTACT_RECIPIENT : undefined,
    },
    newsletter: {
      enabled: newsletterEnabled,
      confirmationBaseUrl: newsletterEnabled
        ? new URL("/newsletter/confirm", secureSiteUrl).toString()
        : undefined,
      unsubscribeBaseUrl: newsletterEnabled
        ? new URL("/newsletter/unsubscribe", secureSiteUrl).toString()
        : undefined,
      preferenceManagementEnabled: newsletterPreferenceManagementEnabled,
    },
    rateLimit,
    turnstileSecret: sharedServerRequirements
      ? parsed.TURNSTILE_SECRET_KEY
      : undefined,
    turnstileExpectedHostname: sharedServerRequirements && secureSiteUrl
      ? new URL(secureSiteUrl).hostname.toLowerCase()
      : undefined,
    brevo: sharedServerRequirements ? brevo : undefined,
  };
}
