import type {
  RateLimitDecision,
  RateLimiter,
  RateLimitRequest,
} from "./rate-limit";

export type PublicWorkflowRpcClient = {
  rpc: (
    functionName: string,
    parameters: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

export type ContactEnquiryRecord = {
  name: string;
  email: string;
  subject: string;
  message: string;
  sourcePage?: string;
  consentedAt: string;
  sourceIpHash: string;
};

export type NewsletterSubscriptionRecord = {
  email: string;
  sourcePage?: string;
  sourceIpHash: string;
};

export type ContactPersistenceResult =
  | { status: "persisted"; id: string }
  | { status: "unavailable" };

export type NewsletterPersistenceResult =
  | {
    status: "persisted";
    confirmationToken: string;
    unsubscribeToken: string;
  }
  | { status: "suppressed" }
  | { status: "unavailable" };

export type NewsletterUnsubscribeResult =
  | { status: "processed" }
  | { status: "unavailable" };

export type PublicWorkflowRepository = {
  rateLimiter: RateLimiter;
  createContactEnquiry(
    record: ContactEnquiryRecord,
  ): Promise<ContactPersistenceResult>;
  upsertNewsletterSubscription(
    record: NewsletterSubscriptionRecord,
  ): Promise<NewsletterPersistenceResult>;
  unsubscribeNewsletterSubscription(
    unsubscribeToken: string,
  ): Promise<NewsletterUnsubscribeResult>;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function createRpcRateLimiter(client: PublicWorkflowRpcClient): RateLimiter {
  return {
    async consume(request: RateLimitRequest): Promise<RateLimitDecision> {
      try {
        const response = await client.rpc("consume_rate_limit", {
          p_scope: request.scope,
          p_subject_hash: request.subjectHash,
          p_window_seconds: request.windowSeconds,
          p_max_attempts: request.maxAttempts,
        });
        const row = response.error ? undefined : asRecord(response.data);

        if (!row || typeof row.allowed !== "boolean") {
          return { status: "unavailable" };
        }

        if (row.allowed) {
          return { status: "allowed", remaining: 0 };
        }

        return {
          status: "limited",
          retryAfterSeconds: positiveInteger(row.retry_after_seconds) ?? 1,
        };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}

/**
 * Wraps the approved service-only RPCs public routes may invoke. All raw
 * personal data and newsletter bearer tokens stay in server-side requests;
 * browser clients never receive table write privileges.
 */
export function createPublicWorkflowRepository(
  client: PublicWorkflowRpcClient,
): PublicWorkflowRepository {
  return {
    rateLimiter: createRpcRateLimiter(client),
    async createContactEnquiry(record) {
      try {
        const response = await client.rpc("create_contact_enquiry", {
          p_name: record.name,
          p_email: record.email,
          p_subject: record.subject,
          p_message: record.message,
          p_source_page: record.sourcePage ?? null,
          p_consented_at: record.consentedAt,
          p_source_ip_hash: record.sourceIpHash,
        });
        const row = response.error ? undefined : asRecord(response.data);

        return !validIdentifier(row?.id)
          ? { status: "unavailable" }
          : { status: "persisted", id: row.id };
      } catch {
        return { status: "unavailable" };
      }
    },
    async upsertNewsletterSubscription(record) {
      try {
        const response = await client.rpc("upsert_newsletter_subscription", {
          p_email: record.email,
          p_source_page: record.sourcePage ?? null,
          p_consent_ip_hash: record.sourceIpHash,
        });
        const row = response.error ? undefined : asRecord(response.data);
        const confirmationToken = row?.confirmation_token;

        if (confirmationToken === null) {
          return { status: "suppressed" };
        }

        if (!validIdentifier(confirmationToken)) {
          return { status: "unavailable" };
        }

        const unsubscribeResponse = await client.rpc(
          "server_resolve_newsletter_unsubscribe_token",
          { p_confirmation_token: confirmationToken },
        );
        const unsubscribeToken = unsubscribeResponse.error
          ? undefined
          : unsubscribeResponse.data;

        return validIdentifier(unsubscribeToken)
          ? { status: "persisted", confirmationToken, unsubscribeToken }
          : { status: "unavailable" };
      } catch {
        return { status: "unavailable" };
      }
    },
    async unsubscribeNewsletterSubscription(unsubscribeToken) {
      try {
        const response = await client.rpc("unsubscribe_newsletter_subscription", {
          p_unsubscribe_token: unsubscribeToken,
        });

        // The database function returns false for unknown, replayed, and
        // suppressed tokens. Treat every well-formed response alike so the
        // browser cannot enumerate newsletter records.
        return typeof response.data === "boolean" && !response.error
          ? { status: "processed" }
          : { status: "unavailable" };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}
