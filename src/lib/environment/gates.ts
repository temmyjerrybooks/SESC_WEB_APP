import { z } from "zod";

import {
  readPublicEnvironment,
  trustedHttpsSiteOrigin,
  type EnvironmentInput,
} from "./public";

export const featureGateNames = [
  "authentication",
  "membershipApplications",
  "privateDocumentUploads",
  "manualPaymentVerification",
  "contactEnquiries",
  "newsletterSubscriptions",
  "emailDelivery",
  "memberPortal",
  "executivePortal",
  "adminPortal",
] as const;

export type FeatureGateName = (typeof featureGateNames)[number];

export type FeatureGateRequirement =
  | "preview-safe-mode"
  | "explicit-enablement"
  | "supabase-public-configuration"
  | "site-url"
  | "supabase-service-role"
  | "database-migrations"
  | "row-level-security"
  | "private-storage"
  | "email-provider-configuration"
  | "contact-delivery-configuration"
  | "contact-retention-controls"
  | "newsletter-abuse-protection"
  | "rate-limiting"
  | "trusted-proxy-headers"
  | "turnstile-configuration"
  | "authentication-public-approval"
  | "authentication"
  | "private-document-uploads";

export type FeatureGateState = {
  enabled: boolean;
  missing: readonly FeatureGateRequirement[];
};

export type FeatureGateStates = Record<FeatureGateName, FeatureGateState>;

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

const optionalPort = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(1).max(65535).optional().catch(undefined),
);

/**
 * Server-side readiness inputs. Every boolean setting must be the literal
 * string true to enable its related prerequisite; malformed values are
 * deliberately treated as unavailable.
 */
export const serverFeatureEnvironmentSchema = z.object({
  SESC_PREVIEW_SAFE_MODE: optionalBooleanFlag,
  SESC_AUTHENTICATION_ENABLED: optionalBooleanFlag,
  SESC_MEMBERSHIP_APPLICATIONS_ENABLED: optionalBooleanFlag,
  SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED: optionalBooleanFlag,
  SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED: optionalBooleanFlag,
  SESC_CONTACT_ENQUIRIES_ENABLED: optionalBooleanFlag,
  SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED: optionalBooleanFlag,
  SESC_EMAIL_DELIVERY_ENABLED: optionalBooleanFlag,
  SESC_MEMBER_PORTAL_ENABLED: optionalBooleanFlag,
  SESC_EXECUTIVE_PORTAL_ENABLED: optionalBooleanFlag,
  SESC_ADMIN_PORTAL_ENABLED: optionalBooleanFlag,
  SESC_DATABASE_MIGRATIONS_READY: optionalBooleanFlag,
  SESC_ROW_LEVEL_SECURITY_READY: optionalBooleanFlag,
  SESC_PRIVATE_STORAGE_READY: optionalBooleanFlag,
  SESC_NEWSLETTER_ABUSE_PROTECTION_READY: optionalBooleanFlag,
  SESC_RATE_LIMITING_READY: optionalBooleanFlag,
  SESC_TRUSTED_PROXY_HEADERS: optionalBooleanFlag,
  SESC_CONTACT_RETENTION_READY: optionalBooleanFlag,
  SESC_CONTACT_RECIPIENT: optionalEmail,
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  TURNSTILE_SECRET_KEY: optionalNonEmptyString,
  BREVO_API_KEY: optionalNonEmptyString,
  BREVO_SMTP_HOST: optionalNonEmptyString,
  BREVO_SMTP_PORT: optionalPort,
  BREVO_SMTP_USERNAME: optionalNonEmptyString,
  BREVO_SMTP_PASSWORD: optionalNonEmptyString,
  BREVO_SENDER_ADDRESS: optionalEmail,
  BREVO_SENDER_NAME: optionalNonEmptyString,
});

type ParsedServerFeatureEnvironment = z.infer<
  typeof serverFeatureEnvironmentSchema
>;

function parseServerFeatureEnvironment(
  environment: EnvironmentInput,
): ParsedServerFeatureEnvironment {
  return serverFeatureEnvironmentSchema.parse({
    SESC_PREVIEW_SAFE_MODE: environment.SESC_PREVIEW_SAFE_MODE,
    SESC_AUTHENTICATION_ENABLED: environment.SESC_AUTHENTICATION_ENABLED,
    SESC_MEMBERSHIP_APPLICATIONS_ENABLED:
      environment.SESC_MEMBERSHIP_APPLICATIONS_ENABLED,
    SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED:
      environment.SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED,
    SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED:
      environment.SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED,
    SESC_CONTACT_ENQUIRIES_ENABLED: environment.SESC_CONTACT_ENQUIRIES_ENABLED,
    SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED:
      environment.SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED,
    SESC_EMAIL_DELIVERY_ENABLED: environment.SESC_EMAIL_DELIVERY_ENABLED,
    SESC_MEMBER_PORTAL_ENABLED: environment.SESC_MEMBER_PORTAL_ENABLED,
    SESC_EXECUTIVE_PORTAL_ENABLED:
      environment.SESC_EXECUTIVE_PORTAL_ENABLED,
    SESC_ADMIN_PORTAL_ENABLED: environment.SESC_ADMIN_PORTAL_ENABLED,
    SESC_DATABASE_MIGRATIONS_READY:
      environment.SESC_DATABASE_MIGRATIONS_READY,
    SESC_ROW_LEVEL_SECURITY_READY:
      environment.SESC_ROW_LEVEL_SECURITY_READY,
    SESC_PRIVATE_STORAGE_READY: environment.SESC_PRIVATE_STORAGE_READY,
    SESC_NEWSLETTER_ABUSE_PROTECTION_READY:
      environment.SESC_NEWSLETTER_ABUSE_PROTECTION_READY,
    SESC_RATE_LIMITING_READY: environment.SESC_RATE_LIMITING_READY,
    SESC_TRUSTED_PROXY_HEADERS: environment.SESC_TRUSTED_PROXY_HEADERS,
    SESC_CONTACT_RETENTION_READY: environment.SESC_CONTACT_RETENTION_READY,
    SESC_CONTACT_RECIPIENT: environment.SESC_CONTACT_RECIPIENT,
    SUPABASE_SERVICE_ROLE_KEY: environment.SUPABASE_SERVICE_ROLE_KEY,
    TURNSTILE_SECRET_KEY: environment.TURNSTILE_SECRET_KEY,
    BREVO_API_KEY: environment.BREVO_API_KEY,
    BREVO_SMTP_HOST: environment.BREVO_SMTP_HOST,
    BREVO_SMTP_PORT: environment.BREVO_SMTP_PORT,
    BREVO_SMTP_USERNAME: environment.BREVO_SMTP_USERNAME,
    BREVO_SMTP_PASSWORD: environment.BREVO_SMTP_PASSWORD,
    BREVO_SENDER_ADDRESS: environment.BREVO_SENDER_ADDRESS,
    BREVO_SENDER_NAME: environment.BREVO_SENDER_NAME,
  });
}

function createGate(
  enabled: boolean,
  missing: FeatureGateRequirement[],
): FeatureGateState {
  return { enabled: enabled && missing.length === 0, missing };
}

function commonRequirements(
  explicitlyEnabled: boolean,
  previewSafeMode: boolean,
): FeatureGateRequirement[] {
  const missing: FeatureGateRequirement[] = [];

  if (previewSafeMode) {
    missing.push("preview-safe-mode");
  }

  if (!explicitlyEnabled) {
    missing.push("explicit-enablement");
  }

  return missing;
}

function emailProviderConfigured(environment: ParsedServerFeatureEnvironment) {
  const hasBrevoApi = Boolean(environment.BREVO_API_KEY);
  return Boolean(
    hasBrevoApi &&
      environment.BREVO_SENDER_ADDRESS &&
      environment.BREVO_SENDER_NAME,
  );
}

/**
 * Evaluates a supplied environment without returning environment values.
 * This pure function keeps unit tests deterministic while the server-only
 * facade reads process.env for routes, server components, and API handlers.
 */
export function evaluateFeatureGates(
  environment: EnvironmentInput,
): FeatureGateStates {
  const publicEnvironment = readPublicEnvironment(environment);
  const serverEnvironment = parseServerFeatureEnvironment(environment);
  const previewSafeMode = serverEnvironment.SESC_PREVIEW_SAFE_MODE !== "false";
  const databaseReady =
    serverEnvironment.SESC_DATABASE_MIGRATIONS_READY === "true";
  const rlsReady = serverEnvironment.SESC_ROW_LEVEL_SECURITY_READY === "true";
  const privateStorageReady =
    serverEnvironment.SESC_PRIVATE_STORAGE_READY === "true";
  const trustedProxyHeaders =
    serverEnvironment.SESC_TRUSTED_PROXY_HEADERS === "true";
  const serviceRoleReady = Boolean(serverEnvironment.SUPABASE_SERVICE_ROLE_KEY);
  const emailReady = emailProviderConfigured(serverEnvironment);
  const supabaseReady = Boolean(publicEnvironment.supabase);
  const secureSiteUrl = trustedHttpsSiteOrigin(publicEnvironment.siteUrl);

  const authenticationMissing = commonRequirements(
    serverEnvironment.SESC_AUTHENTICATION_ENABLED === "true",
    previewSafeMode,
  );
  if (!supabaseReady) authenticationMissing.push("supabase-public-configuration");
  // Account-action requests use the privileged client only to persist the
  // server-owned rate-limit decision. Do not advertise authentication as
  // ready when that client cannot be constructed at runtime.
  if (!serviceRoleReady) authenticationMissing.push("supabase-service-role");
  if (!publicEnvironment.authActionsEnabled) {
    authenticationMissing.push("authentication-public-approval");
  }
  if (!secureSiteUrl) authenticationMissing.push("site-url");
  if (!databaseReady) authenticationMissing.push("database-migrations");
  if (!rlsReady) authenticationMissing.push("row-level-security");
  if (serverEnvironment.SESC_RATE_LIMITING_READY !== "true") {
    authenticationMissing.push("rate-limiting");
  }
  if (!trustedProxyHeaders) authenticationMissing.push("trusted-proxy-headers");
  if (!publicEnvironment.turnstileSiteKey || !serverEnvironment.TURNSTILE_SECRET_KEY) {
    authenticationMissing.push("turnstile-configuration");
  }
  const authentication = createGate(true, authenticationMissing);

  const emailDeliveryMissing = commonRequirements(
    serverEnvironment.SESC_EMAIL_DELIVERY_ENABLED === "true",
    previewSafeMode,
  );
  if (!emailReady) emailDeliveryMissing.push("email-provider-configuration");
  const emailDelivery = createGate(true, emailDeliveryMissing);

  const privateDocumentUploadsMissing = commonRequirements(
    serverEnvironment.SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED === "true",
    previewSafeMode,
  );
  if (!supabaseReady) {
    privateDocumentUploadsMissing.push("supabase-public-configuration");
  }
  if (!serviceRoleReady) privateDocumentUploadsMissing.push("supabase-service-role");
  if (!databaseReady) privateDocumentUploadsMissing.push("database-migrations");
  if (!rlsReady) privateDocumentUploadsMissing.push("row-level-security");
  if (!privateStorageReady) privateDocumentUploadsMissing.push("private-storage");
  const privateDocumentUploads = createGate(
    true,
    privateDocumentUploadsMissing,
  );

  const membershipApplicationsMissing = commonRequirements(
    serverEnvironment.SESC_MEMBERSHIP_APPLICATIONS_ENABLED === "true",
    previewSafeMode,
  );
  if (!authentication.enabled) membershipApplicationsMissing.push("authentication");
  if (!privateDocumentUploads.enabled) {
    membershipApplicationsMissing.push("private-document-uploads");
  }
  if (serverEnvironment.SESC_RATE_LIMITING_READY !== "true") {
    membershipApplicationsMissing.push("rate-limiting");
  }
  if (!publicEnvironment.turnstileSiteKey || !serverEnvironment.TURNSTILE_SECRET_KEY) {
    membershipApplicationsMissing.push("turnstile-configuration");
  }
  const membershipApplications = createGate(
    true,
    membershipApplicationsMissing,
  );

  const manualPaymentVerificationMissing = commonRequirements(
    serverEnvironment.SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED === "true",
    previewSafeMode,
  );
  if (!authentication.enabled) {
    manualPaymentVerificationMissing.push("authentication");
  }
  if (!privateDocumentUploads.enabled) {
    manualPaymentVerificationMissing.push("private-document-uploads");
  }
  if (!serviceRoleReady) {
    manualPaymentVerificationMissing.push("supabase-service-role");
  }
  const manualPaymentVerification = createGate(
    true,
    manualPaymentVerificationMissing,
  );

  const contactEnquiriesMissing = commonRequirements(
    serverEnvironment.SESC_CONTACT_ENQUIRIES_ENABLED === "true",
    previewSafeMode,
  );
  if (!supabaseReady) contactEnquiriesMissing.push("supabase-public-configuration");
  if (!secureSiteUrl) contactEnquiriesMissing.push("site-url");
  if (!serviceRoleReady) contactEnquiriesMissing.push("supabase-service-role");
  if (!databaseReady) contactEnquiriesMissing.push("database-migrations");
  if (!rlsReady) contactEnquiriesMissing.push("row-level-security");
  if (!emailDelivery.enabled) contactEnquiriesMissing.push("email-provider-configuration");
  if (!serverEnvironment.SESC_CONTACT_RECIPIENT) {
    contactEnquiriesMissing.push("contact-delivery-configuration");
  }
  if (serverEnvironment.SESC_CONTACT_RETENTION_READY !== "true") {
    contactEnquiriesMissing.push("contact-retention-controls");
  }
  if (serverEnvironment.SESC_RATE_LIMITING_READY !== "true") {
    contactEnquiriesMissing.push("rate-limiting");
  }
  if (!trustedProxyHeaders) contactEnquiriesMissing.push("trusted-proxy-headers");
  if (!publicEnvironment.turnstileSiteKey || !serverEnvironment.TURNSTILE_SECRET_KEY) {
    contactEnquiriesMissing.push("turnstile-configuration");
  }
  const contactEnquiries = createGate(true, contactEnquiriesMissing);

  const newsletterSubscriptionsMissing = commonRequirements(
    serverEnvironment.SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED === "true",
    previewSafeMode,
  );
  if (!supabaseReady) {
    newsletterSubscriptionsMissing.push("supabase-public-configuration");
  }
  if (!secureSiteUrl) newsletterSubscriptionsMissing.push("site-url");
  if (!serviceRoleReady) {
    newsletterSubscriptionsMissing.push("supabase-service-role");
  }
  if (!databaseReady) newsletterSubscriptionsMissing.push("database-migrations");
  if (!rlsReady) newsletterSubscriptionsMissing.push("row-level-security");
  if (!emailDelivery.enabled) {
    newsletterSubscriptionsMissing.push("email-provider-configuration");
  }
  if (serverEnvironment.SESC_NEWSLETTER_ABUSE_PROTECTION_READY !== "true") {
    newsletterSubscriptionsMissing.push("newsletter-abuse-protection");
  }
  if (serverEnvironment.SESC_RATE_LIMITING_READY !== "true") {
    newsletterSubscriptionsMissing.push("rate-limiting");
  }
  if (!trustedProxyHeaders) {
    newsletterSubscriptionsMissing.push("trusted-proxy-headers");
  }
  if (!publicEnvironment.turnstileSiteKey || !serverEnvironment.TURNSTILE_SECRET_KEY) {
    newsletterSubscriptionsMissing.push("turnstile-configuration");
  }
  const newsletterSubscriptions = createGate(
    true,
    newsletterSubscriptionsMissing,
  );

  const memberPortalMissing = commonRequirements(
    serverEnvironment.SESC_MEMBER_PORTAL_ENABLED === "true",
    previewSafeMode,
  );
  if (!authentication.enabled) memberPortalMissing.push("authentication");
  const memberPortal = createGate(true, memberPortalMissing);

  const executivePortalMissing = commonRequirements(
    serverEnvironment.SESC_EXECUTIVE_PORTAL_ENABLED === "true",
    previewSafeMode,
  );
  if (!authentication.enabled) executivePortalMissing.push("authentication");
  const executivePortal = createGate(true, executivePortalMissing);

  const adminPortalMissing = commonRequirements(
    serverEnvironment.SESC_ADMIN_PORTAL_ENABLED === "true",
    previewSafeMode,
  );
  if (!authentication.enabled) adminPortalMissing.push("authentication");
  const adminPortal = createGate(true, adminPortalMissing);

  return {
    authentication,
    membershipApplications,
    privateDocumentUploads,
    manualPaymentVerification,
    contactEnquiries,
    newsletterSubscriptions,
    emailDelivery,
    memberPortal,
    executivePortal,
    adminPortal,
  };
}

/**
 * Safe to expose through a health endpoint: it contains no variables,
 * secrets, URLs, identifiers, or internal failure details.
 */
export function createPublicReadiness(
  environment: EnvironmentInput,
): Record<FeatureGateName, "available" | "unavailable"> {
  const gates = evaluateFeatureGates(environment);

  return Object.fromEntries(
    featureGateNames.map((name) => [
      name,
      gates[name].enabled ? "available" : "unavailable",
    ]),
  ) as Record<FeatureGateName, "available" | "unavailable">;
}
