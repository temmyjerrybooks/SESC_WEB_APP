import { renderTransactionalEmail, type TransactionalEmailKind } from "./templates";

export type BrevoConfiguration = {
  apiKey?: string;
  senderEmail?: string;
  senderName?: string;
  enabled: boolean;
};

export type TransactionalDeliveryRequest = {
  recipientEmail: string;
  kind: TransactionalEmailKind;
  actionUrl?: string;
  idempotencyKey: string;
};

/** A small server-only escape hatch for trusted public workflow mail. */
export type BrevoEmailMessage = {
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  tags?: readonly string[];
};

export type DeliveryResult =
  | { status: "unavailable" }
  | { status: "queued" }
  | { status: "rejected" };

type FetchLike = (input: string, init: RequestInit) => Promise<{ ok: boolean }>;

export function isBrevoConfigured(config: BrevoConfiguration): boolean {
  return Boolean(
    config.enabled &&
      config.apiKey &&
      config.senderEmail &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.senderEmail),
  );
}

/**
 * Sends a pre-rendered, trusted server email through Brevo. It deliberately
 * has no logging, retry loop, or browser-facing error details. Callers must
 * validate recipient data and use an idempotency key before calling it.
 */
export async function sendBrevoEmail(
  message: BrevoEmailMessage,
  config: BrevoConfiguration,
  fetcher: FetchLike = fetch,
): Promise<DeliveryResult> {
  if (
    !isBrevoConfigured(config) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(message.recipientEmail) ||
    !message.subject.trim() ||
    !message.html ||
    !message.text ||
    !message.idempotencyKey.trim()
  ) {
    return { status: "unavailable" };
  }

  try {
    const response = await fetcher("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.apiKey!,
        "content-type": "application/json",
        "x-request-id": message.idempotencyKey,
      },
      body: JSON.stringify({
        sender: { email: config.senderEmail, name: config.senderName || "SESC Nigeria" },
        to: [{ email: message.recipientEmail }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
        tags: message.tags?.length ? [...message.tags] : ["transactional", "sesc"],
      }),
    });

    return response.ok ? { status: "queued" } : { status: "rejected" };
  } catch {
    return { status: "rejected" };
  }
}

/**
 * Makes one provider request only. Retries belong to an idempotent server-side
 * job queue once it is configured; this avoids duplicate notices when a
 * provider accepted a request but the connection was interrupted.
 */
export async function sendTransactionalEmail(
  request: TransactionalDeliveryRequest,
  config: BrevoConfiguration,
  fetcher: FetchLike = fetch,
): Promise<DeliveryResult> {
  if (!isBrevoConfigured(config)) {
    return { status: "unavailable" };
  }

  const email = renderTransactionalEmail(request.kind, request.actionUrl);
  return sendBrevoEmail(
    {
      recipientEmail: request.recipientEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: request.idempotencyKey,
      tags: ["transactional", "sesc"],
    },
    config,
    fetcher,
  );
}
