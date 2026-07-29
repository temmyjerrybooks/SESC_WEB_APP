import { z } from "zod";

import type { EnvironmentInput } from "./public";

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(
  blankToUndefined,
  z.string().trim().url().optional().catch(undefined),
);
const optionalEmail = z.preprocess(
  blankToUndefined,
  z.string().trim().email().optional().catch(undefined),
);
const optionalBucket = z.preprocess(
  blankToUndefined,
  z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/).optional().catch(undefined),
);
const optionalString = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional().catch(undefined),
);

/**
 * Typed, non-secret configuration shape for the documented runtime inputs.
 * Invalid optional values become unavailable rather than being echoed in an
 * error. Secrets are intentionally represented only as presence booleans.
 */
export const applicationEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  SUPABASE_DB_URL: optionalUrl,
  SUPABASE_MEMBER_PRIVATE_BUCKET: optionalBucket,
  SUPABASE_PAYMENT_RECEIPTS_BUCKET: optionalBucket,
  SUPABASE_MEMBERSHIP_DOCUMENTS_BUCKET: optionalBucket,
  TURNSTILE_SECRET_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  SENTRY_DSN: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  SESC_CONTACT_RECIPIENT: optionalEmail,
  SESC_SPONSORSHIP_CONTACT: optionalEmail,
  NEXT_PUBLIC_FIREBASE_API_KEY: optionalString,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: optionalString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: optionalString,
  NEXT_PUBLIC_FIREBASE_APP_ID: optionalString,
});

export type ApplicationEnvironment = {
  siteUrl?: string;
  databaseUrlConfigured: boolean;
  storageBuckets: {
    memberPrivate?: string;
    paymentReceipts?: string;
    membershipDocuments?: string;
  };
  turnstileConfigured: boolean;
  sentryConfigured: boolean;
  contactRecipient?: string;
  sponsorshipContact?: string;
  firebaseWebPushConfigured: boolean;
};

export function readApplicationEnvironment(
  environment: EnvironmentInput = process.env,
): ApplicationEnvironment {
  const parsed = applicationEnvironmentSchema.parse(environment);

  return {
    siteUrl: parsed.NEXT_PUBLIC_SITE_URL,
    databaseUrlConfigured: Boolean(parsed.SUPABASE_DB_URL),
    storageBuckets: {
      memberPrivate: parsed.SUPABASE_MEMBER_PRIVATE_BUCKET,
      paymentReceipts: parsed.SUPABASE_PAYMENT_RECEIPTS_BUCKET,
      membershipDocuments: parsed.SUPABASE_MEMBERSHIP_DOCUMENTS_BUCKET,
    },
    turnstileConfigured: Boolean(
      parsed.TURNSTILE_SECRET_KEY && parsed.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    ),
    sentryConfigured: Boolean(parsed.SENTRY_DSN || parsed.NEXT_PUBLIC_SENTRY_DSN),
    contactRecipient: parsed.SESC_CONTACT_RECIPIENT,
    sponsorshipContact: parsed.SESC_SPONSORSHIP_CONTACT,
    firebaseWebPushConfigured: Boolean(
      parsed.NEXT_PUBLIC_FIREBASE_API_KEY &&
        parsed.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
        parsed.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
        parsed.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
        parsed.NEXT_PUBLIC_FIREBASE_APP_ID,
    ),
  };
}
