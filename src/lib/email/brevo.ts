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
  const response = await fetcher("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": config.apiKey!,
      "content-type": "application/json",
      "x-request-id": request.idempotencyKey,
    },
    body: JSON.stringify({
      sender: { email: config.senderEmail, name: config.senderName || "SESC Nigeria" },
      to: [{ email: request.recipientEmail }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ["transactional", "sesc"],
    }),
  });

  return response.ok ? { status: "queued" } : { status: "rejected" };
}
