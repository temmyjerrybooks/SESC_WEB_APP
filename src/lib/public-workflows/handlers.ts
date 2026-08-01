import type { DeliveryResult } from "@/lib/email/brevo";
import { verifyTurnstile, type TurnstileVerification } from "@/lib/security/turnstile";

import { renderContactDeliveryEmail } from "./contact-email";
import type { PublicFormRateLimitSettings } from "./configuration";
import type { RateLimiter } from "./rate-limit";
import type { PublicWorkflowRepository } from "./repository";
import {
  contactSubmissionSchema,
  isNewsletterUnsubscribeToken,
  newsletterSubmissionSchema,
  normalizePublicEmail,
} from "./validation";

export const publicWorkflowMessages = {
  unavailable: "This service is not available in the current environment.",
  invalid: "We could not process this request. Please review the form and try again.",
  rateLimited: "Please wait before trying again.",
  contactAccepted: "Your request has been received.",
  newsletterAccepted:
    "If this address can be subscribed, a confirmation message will be sent.",
  newsletterUnsubscribeAccepted:
    "Your newsletter preference has been updated.",
} as const;

export type PublicWorkflowOutcome = {
  status: 202 | 400 | 429 | 503;
  message: string;
  retryAfterSeconds?: number;
};

export type PublicWorkflowMailer = {
  sendContact(input: {
    recipientEmail: string;
    subject: string;
    html: string;
    text: string;
    idempotencyKey: string;
  }): Promise<DeliveryResult>;
  sendNewsletterConfirmation(input: {
    recipientEmail: string;
    confirmationUrl: string;
    unsubscribeUrl: string;
    idempotencyKey: string;
  }): Promise<DeliveryResult>;
};

export type ContactWorkflowDependencies = {
  repository: PublicWorkflowRepository;
  mailer: PublicWorkflowMailer;
  turnstile: (token: string, remoteIp: string) => Promise<TurnstileVerification>;
  recipientEmail: string;
  sourceIpHash: string;
  remoteIp: string;
  now?: () => Date;
  createIdempotencyKey?: () => string;
};

export type NewsletterWorkflowDependencies = {
  repository: PublicWorkflowRepository;
  mailer: PublicWorkflowMailer;
  turnstile: (token: string, remoteIp: string) => Promise<TurnstileVerification>;
  sourceIpHash: string;
  remoteIp: string;
  confirmationBaseUrl: string;
  unsubscribeBaseUrl: string;
  createIdempotencyKey?: () => string;
};

export type NewsletterUnsubscribeDependencies = {
  repository: Pick<
    PublicWorkflowRepository,
    "unsubscribeNewsletterSubscription"
  >;
};

function unavailable(): PublicWorkflowOutcome {
  return { status: 503, message: publicWorkflowMessages.unavailable };
}

function invalid(): PublicWorkflowOutcome {
  return { status: 400, message: publicWorkflowMessages.invalid };
}

export async function admitPublicWorkflowRequest(
  rateLimiter: RateLimiter,
  rateLimit: PublicFormRateLimitSettings | undefined,
  scope: string,
  sourceIpHash: string | undefined,
): Promise<PublicWorkflowOutcome | undefined> {
  if (!rateLimit || !sourceIpHash) {
    return unavailable();
  }

  const decision = await rateLimiter.consume({
    scope,
    subjectHash: sourceIpHash,
    maxAttempts: rateLimit.maxAttempts,
    windowSeconds: rateLimit.windowSeconds,
  });

  if (decision.status === "unavailable") {
    return unavailable();
  }

  if (decision.status === "limited") {
    return {
      status: 429,
      message: publicWorkflowMessages.rateLimited,
      retryAfterSeconds: decision.retryAfterSeconds,
    };
  }

  return undefined;
}

export async function submitContactEnquiry(
  payload: unknown,
  dependencies: ContactWorkflowDependencies,
): Promise<PublicWorkflowOutcome> {
  const parsed = contactSubmissionSchema.safeParse(payload);
  if (!parsed.success) return invalid();

  const submission = parsed.data;
  if (submission.website) {
    return { status: 202, message: publicWorkflowMessages.contactAccepted };
  }

  const challenge = await dependencies.turnstile(
    submission.turnstileToken,
    dependencies.remoteIp,
  );
  if (challenge.status !== "passed") return invalid();

  const persisted = await dependencies.repository.createContactEnquiry({
    name: submission.name,
    email: normalizePublicEmail(submission.email),
    subject: submission.subject,
    message: submission.message,
    sourcePage: submission.sourcePage,
    consentedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    sourceIpHash: dependencies.sourceIpHash,
  });
  if (persisted.status !== "persisted") return unavailable();

  const email = renderContactDeliveryEmail({
    ...submission,
    email: normalizePublicEmail(submission.email),
  });
  await dependencies.mailer.sendContact({
    recipientEmail: dependencies.recipientEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    idempotencyKey: dependencies.createIdempotencyKey?.() ?? persisted.id,
  });

  // Persistence is the durable acknowledgement. Provider delivery may be
  // retried by authorised support tooling without asking a visitor to submit
  // the same personal data again.
  return { status: 202, message: publicWorkflowMessages.contactAccepted };
}

export function createNewsletterConfirmationUrl(
  confirmationBaseUrl: string,
  confirmationToken: string,
): string | undefined {
  try {
    const url = new URL(confirmationBaseUrl);
    if (url.protocol !== "https:") return undefined;
    url.searchParams.set("token", confirmationToken);
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Keeps the unsubscribe bearer capability out of request URLs and referrers.
 * The client reads this fragment locally, clears it from browser history, and
 * sends it only in an explicit JSON POST.
 */
export function createNewsletterUnsubscribeUrl(
  unsubscribeBaseUrl: string,
  unsubscribeToken: string,
): string | undefined {
  try {
    const url = new URL(unsubscribeBaseUrl);
    if (
      url.protocol !== "https:" ||
      !isNewsletterUnsubscribeToken(unsubscribeToken)
    ) {
      return undefined;
    }

    url.hash = new URLSearchParams({ token: unsubscribeToken }).toString();
    return url.toString();
  } catch {
    return undefined;
  }
}

export async function submitNewsletterSubscription(
  payload: unknown,
  dependencies: NewsletterWorkflowDependencies,
): Promise<PublicWorkflowOutcome> {
  const parsed = newsletterSubmissionSchema.safeParse(payload);
  if (!parsed.success) return invalid();

  const submission = parsed.data;
  if (submission.website) {
    return { status: 202, message: publicWorkflowMessages.newsletterAccepted };
  }

  const challenge = await dependencies.turnstile(
    submission.turnstileToken,
    dependencies.remoteIp,
  );
  if (challenge.status !== "passed") return invalid();

  const persisted = await dependencies.repository.upsertNewsletterSubscription({
    email: normalizePublicEmail(submission.email),
    sourcePage: submission.sourcePage,
    sourceIpHash: dependencies.sourceIpHash,
  });
  if (persisted.status === "suppressed") {
    return { status: 202, message: publicWorkflowMessages.newsletterAccepted };
  }
  if (persisted.status !== "persisted") return unavailable();

  const confirmationUrl = createNewsletterConfirmationUrl(
    dependencies.confirmationBaseUrl,
    persisted.confirmationToken,
  );
  const unsubscribeUrl = createNewsletterUnsubscribeUrl(
    dependencies.unsubscribeBaseUrl,
    persisted.unsubscribeToken,
  );
  if (!confirmationUrl || !unsubscribeUrl) return unavailable();

  const delivery = await dependencies.mailer.sendNewsletterConfirmation({
    recipientEmail: normalizePublicEmail(submission.email),
    confirmationUrl,
    unsubscribeUrl,
    idempotencyKey:
      dependencies.createIdempotencyKey?.() ?? persisted.confirmationToken,
  });
  if (delivery.status !== "queued") return unavailable();

  return { status: 202, message: publicWorkflowMessages.newsletterAccepted };
}

/**
 * An unsubscribe bearer token never tells the browser whether it matched a
 * recipient. Replays and unknown UUIDs deliberately receive the same success
 * response as a completed preference update.
 */
export async function unsubscribeNewsletter(
  token: unknown,
  dependencies: NewsletterUnsubscribeDependencies,
): Promise<PublicWorkflowOutcome> {
  if (!isNewsletterUnsubscribeToken(token)) {
    return {
      status: 202,
      message: publicWorkflowMessages.newsletterUnsubscribeAccepted,
    };
  }

  const result = await dependencies.repository.unsubscribeNewsletterSubscription(
    token,
  );
  if (result.status === "unavailable") return unavailable();

  return {
    status: 202,
    message: publicWorkflowMessages.newsletterUnsubscribeAccepted,
  };
}

/** The default verifier is exported for runtime assembly and easy injection. */
export const defaultTurnstileVerifier = verifyTurnstile;
