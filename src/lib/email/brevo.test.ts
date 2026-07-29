import { describe, expect, it, vi } from "vitest";

import { isBrevoConfigured, sendTransactionalEmail } from "./brevo";

const request = {
  recipientEmail: "member@example.test",
  kind: "application_received" as const,
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
};

describe("Brevo transactional adapter", () => {
  it("fails closed before delivery configuration exists", async () => {
    const fetcher = vi.fn();

    await expect(sendTransactionalEmail(request, { enabled: false }, fetcher)).resolves.toEqual({ status: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("builds one branded, idempotent provider request without logging data", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    const result = await sendTransactionalEmail(
      request,
      {
        enabled: true,
        apiKey: "test-key",
        senderEmail: "notices@example.test",
        senderName: "SESC Nigeria",
      },
      fetcher,
    );

    expect(result).toEqual({ status: "queued" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({ "x-request-id": request.idempotencyKey });
    expect(String(options.body)).toContain("Update from Super Eagles Supporters Club");
  });

  it("requires explicit complete configuration", () => {
    expect(isBrevoConfigured({ enabled: true, apiKey: "key", senderEmail: "invalid", senderName: "SESC" })).toBe(false);
    expect(isBrevoConfigured({ enabled: true, apiKey: "key", senderEmail: "notices@example.test", senderName: "SESC" })).toBe(true);
  });
});
