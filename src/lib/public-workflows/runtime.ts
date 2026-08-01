import "server-only";

import {
  sendBrevoEmail,
  type BrevoConfiguration,
  type DeliveryResult,
} from "@/lib/email/brevo";
import { renderTransactionalEmail } from "@/lib/email/templates";
import { getFeatureGate } from "@/lib/environment/server";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { createServiceRoleClient } from "@/lib/supabase/server";

import { hashClientAddress, readClientAddress } from "./client-identity";
import {
  evaluatePublicWorkflowConfiguration,
  type PublicFormRateLimitSettings,
  type PublicWorkflowConfiguration,
} from "./configuration";
import type { PublicWorkflowMailer } from "./handlers";
import {
  createPublicWorkflowRepository,
  type PublicWorkflowRepository,
} from "./repository";

type PublicWorkflowRuntime = {
  repository: PublicWorkflowRepository;
  mailer: PublicWorkflowMailer;
  rateLimit: PublicFormRateLimitSettings;
  sourceIpHash: string;
  remoteIp: string;
  turnstile: (
    token: string,
    remoteIp: string,
  ) => Promise<{ status: "passed" | "failed" | "unavailable" }>;
};

export type ContactWorkflowRuntime = PublicWorkflowRuntime & {
  recipientEmail: string;
};

export type NewsletterWorkflowRuntime = PublicWorkflowRuntime & {
  confirmationBaseUrl: string;
  unsubscribeBaseUrl: string;
};

export type NewsletterUnsubscribeRuntime = {
  repository: Pick<
    PublicWorkflowRepository,
    "unsubscribeNewsletterSubscription"
  >;
};

function createMailer(config: BrevoConfiguration): PublicWorkflowMailer {
  return {
    async sendContact(input): Promise<DeliveryResult> {
      return sendBrevoEmail(
        {
          ...input,
          tags: ["public-contact", "sesc"],
        },
        config,
      );
    },
    async sendNewsletterConfirmation(input): Promise<DeliveryResult> {
      const email = renderTransactionalEmail(
        "newsletter_confirmation",
        input.confirmationUrl,
        input.unsubscribeUrl,
      );
      return sendBrevoEmail(
        {
          recipientEmail: input.recipientEmail,
          subject: email.subject,
          html: email.html,
          text: email.text,
          idempotencyKey: input.idempotencyKey,
          tags: ["newsletter", "sesc"],
        },
        config,
      );
    },
  };
}

function getWorkflowConfiguration(): PublicWorkflowConfiguration {
  return evaluatePublicWorkflowConfiguration(process.env, {
    contactEnquiriesEnabled: getFeatureGate("contactEnquiries").enabled,
    emailDeliveryEnabled: getFeatureGate("emailDelivery").enabled,
    newsletterSubscriptionsEnabled: getFeatureGate("newsletterSubscriptions").enabled,
  });
}

function createRuntime(
  request: Request,
  configuration: PublicWorkflowConfiguration,
  hashScope: string,
  turnstileAction: string,
): PublicWorkflowRuntime | undefined {
  const address = readClientAddress(request.headers, true);

  if (
    !address ||
    !configuration.rateLimit ||
    !configuration.turnstileSecret ||
    !configuration.brevo
  ) {
    return undefined;
  }

  try {
    const repository = createPublicWorkflowRepository(createServiceRoleClient());
    const runtime: PublicWorkflowRuntime = {
      repository,
      mailer: createMailer({ ...configuration.brevo, enabled: true }),
      rateLimit: configuration.rateLimit,
      sourceIpHash: hashClientAddress(hashScope, address),
      remoteIp: address,
      turnstile: (token, remoteIp) =>
        verifyTurnstile(token, configuration.turnstileSecret, remoteIp, {
          expectedAction: turnstileAction,
          expectedHostname: configuration.turnstileExpectedHostname,
        }),
    };

    return runtime;
  } catch {
    return undefined;
  }
}

export function getContactWorkflowRuntime(
  request: Request,
): ContactWorkflowRuntime | undefined {
  const configuration = getWorkflowConfiguration();
  const recipientEmail = configuration.contact.recipient;
  if (!configuration.contact.enabled || !recipientEmail) return undefined;

  const runtime = createRuntime(request, configuration, "contact", "sesc_contact");
  if (!runtime) return undefined;

  return { ...runtime, recipientEmail };
}

export function getNewsletterWorkflowRuntime(
  request: Request,
): NewsletterWorkflowRuntime | undefined {
  const configuration = getWorkflowConfiguration();
  const confirmationBaseUrl = configuration.newsletter.confirmationBaseUrl;
  const unsubscribeBaseUrl = configuration.newsletter.unsubscribeBaseUrl;
  if (
    !configuration.newsletter.enabled ||
    !confirmationBaseUrl ||
    !unsubscribeBaseUrl
  ) {
    return undefined;
  }

  const runtime = createRuntime(request, configuration, "newsletter", "sesc_newsletter");
  if (!runtime) return undefined;

  return {
    ...runtime,
    confirmationBaseUrl,
    unsubscribeBaseUrl,
  };
}

/**
 * Preference management remains available when new subscriptions are paused.
 * It does not need a client address, rate limit, Turnstile, or mail provider:
 * the opaque UUID is the capability and the route makes no subscription-state
 * distinction in its response.
 */
export function getNewsletterUnsubscribeRuntime(): NewsletterUnsubscribeRuntime | undefined {
  const configuration = getWorkflowConfiguration();
  if (!configuration.newsletter.preferenceManagementEnabled) return undefined;

  try {
    return {
      repository: createPublicWorkflowRepository(createServiceRoleClient()),
    };
  } catch {
    return undefined;
  }
}
