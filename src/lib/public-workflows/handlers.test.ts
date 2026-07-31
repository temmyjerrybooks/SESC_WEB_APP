import { describe, expect, it, vi } from "vitest";

import type { PublicWorkflowMailer } from "./handlers";
import {
  admitPublicWorkflowRequest,
  createNewsletterConfirmationUrl,
  createNewsletterUnsubscribeUrl,
  publicWorkflowMessages,
  submitContactEnquiry,
  submitNewsletterSubscription,
  unsubscribeNewsletter,
} from "./handlers";
import type { RateLimiter } from "./rate-limit";
import type { PublicWorkflowRepository } from "./repository";

const uuid = "11111111-1111-4111-8111-111111111111";

function createRepository(): PublicWorkflowRepository {
  return {
    rateLimiter: {
      consume: vi.fn().mockResolvedValue({ status: "allowed", remaining: 2 }),
    },
    createContactEnquiry: vi.fn().mockResolvedValue({ status: "persisted", id: uuid }),
    upsertNewsletterSubscription: vi.fn().mockResolvedValue({
      status: "persisted",
      confirmationToken: uuid,
      unsubscribeToken: uuid,
    }),
    unsubscribeNewsletterSubscription: vi.fn().mockResolvedValue({ status: "processed" }),
  };
}

function createMailer(): PublicWorkflowMailer {
  return {
    sendContact: vi.fn().mockResolvedValue({ status: "queued" }),
    sendNewsletterConfirmation: vi.fn().mockResolvedValue({ status: "queued" }),
  };
}

const contactPayload = {
  name: "Ada Supporter",
  email: "ADA@example.test",
  subject: "Membership question",
  message: "Please share the <official> membership process.",
  sourcePage: "/contact",
  turnstileToken: "token",
};

describe("public workflow handlers", () => {
  it("admits only requests accepted by the durable limiter", async () => {
    const limited: RateLimiter = {
      async consume() {
        return { status: "limited", retryAfterSeconds: 22 };
      },
    };

    await expect(
      admitPublicWorkflowRequest(
        limited,
        { maxAttempts: 3, windowSeconds: 60 },
        "contact",
        "a".repeat(64),
      ),
    ).resolves.toEqual({
      status: 429,
      message: publicWorkflowMessages.rateLimited,
      retryAfterSeconds: 22,
    });
  });

  it("validates, verifies, persists, and dispatches a contact enquiry without echoing data", async () => {
    const repository = createRepository();
    const mailer = createMailer();
    const turnstile = vi.fn().mockResolvedValue({ status: "passed" });

    await expect(
      submitContactEnquiry(contactPayload, {
        repository,
        mailer,
        turnstile,
        recipientEmail: "support@example.test",
        sourceIpHash: "b".repeat(64),
        remoteIp: "203.0.113.42",
        now: () => new Date("2026-07-30T00:00:00.000Z"),
        createIdempotencyKey: () => uuid,
      }),
    ).resolves.toEqual({
      status: 202,
      message: publicWorkflowMessages.contactAccepted,
    });

    expect(repository.createContactEnquiry).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.test",
        sourceIpHash: "b".repeat(64),
      }),
    );
    expect(mailer.sendContact).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "support@example.test",
        idempotencyKey: uuid,
        html: expect.stringContaining("&lt;official&gt;"),
      }),
    );
  });

  it("rejects invalid contact payloads before challenge or persistence", async () => {
    const repository = createRepository();
    const mailer = createMailer();
    const turnstile = vi.fn();

    await expect(
      submitContactEnquiry({ ...contactPayload, extra: true }, {
        repository,
        mailer,
        turnstile,
        recipientEmail: "support@example.test",
        sourceIpHash: "b".repeat(64),
        remoteIp: "203.0.113.42",
      }),
    ).resolves.toEqual({
      status: 400,
      message: publicWorkflowMessages.invalid,
    });
    expect(turnstile).not.toHaveBeenCalled();
    expect(repository.createContactEnquiry).not.toHaveBeenCalled();
  });

  it("keeps newsletter suppression non-enumerating and sends a secure confirmation for valid pending records", async () => {
    const repository = createRepository();
    const mailer = createMailer();
    const turnstile = vi.fn().mockResolvedValue({ status: "passed" });
    const dependencies = {
      repository,
      mailer,
      turnstile,
      sourceIpHash: "c".repeat(64),
      remoteIp: "203.0.113.42",
      confirmationBaseUrl: "https://sesc.example.test/newsletter/confirm",
      unsubscribeBaseUrl: "https://sesc.example.test/newsletter/unsubscribe",
      createIdempotencyKey: () => uuid,
    };
    const payload = {
      email: "member@example.test",
      sourcePage: "/",
      turnstileToken: "token",
    };

    await expect(submitNewsletterSubscription(payload, dependencies)).resolves.toEqual({
      status: 202,
      message: publicWorkflowMessages.newsletterAccepted,
    });
    expect(mailer.sendNewsletterConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmationUrl: `https://sesc.example.test/newsletter/confirm?token=${uuid}`,
        unsubscribeUrl: `https://sesc.example.test/newsletter/unsubscribe#token=${uuid}`,
      }),
    );

    vi.mocked(repository.upsertNewsletterSubscription).mockResolvedValueOnce({
      status: "suppressed",
    });
    await expect(submitNewsletterSubscription(payload, dependencies)).resolves.toEqual({
      status: 202,
      message: publicWorkflowMessages.newsletterAccepted,
    });
  });

  it("uses only HTTPS fragment URLs for newsletter unsubscribe bearer tokens", () => {
    expect(createNewsletterConfirmationUrl("http://localhost/confirm", uuid)).toBeUndefined();
    expect(
      createNewsletterUnsubscribeUrl(
        "https://sesc.example.test/newsletter/unsubscribe",
        uuid,
      ),
    ).toBe(`https://sesc.example.test/newsletter/unsubscribe#token=${uuid}`);
    expect(
      createNewsletterUnsubscribeUrl(
        "https://sesc.example.test/newsletter/unsubscribe",
        "a".repeat(32),
      ),
    ).toBeUndefined();
    expect(
      createNewsletterUnsubscribeUrl("http://localhost/unsubscribe", uuid),
    ).toBeUndefined();
  });

  it("makes unsubscribe success non-enumerating", async () => {
    const repository = createRepository();
    const dependencies = { repository };

    const processed = await unsubscribeNewsletter(uuid, dependencies);
    const malformed = await unsubscribeNewsletter("not-a-token", dependencies);

    expect(processed).toEqual({
      status: 202,
      message: publicWorkflowMessages.newsletterUnsubscribeAccepted,
    });
    expect(malformed).toEqual(processed);
    expect(repository.unsubscribeNewsletterSubscription).toHaveBeenCalledTimes(1);

    vi.mocked(repository.unsubscribeNewsletterSubscription).mockResolvedValueOnce({
      status: "unavailable",
    });
    await expect(unsubscribeNewsletter(uuid, dependencies)).resolves.toEqual({
      status: 503,
      message: publicWorkflowMessages.unavailable,
    });
  });
});
