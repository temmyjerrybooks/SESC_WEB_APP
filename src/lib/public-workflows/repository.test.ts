import { describe, expect, it, vi } from "vitest";

import { createPublicWorkflowRepository } from "./repository";

const uuid = "11111111-1111-4111-8111-111111111111";

describe("public workflow Supabase RPC adapter", () => {
  it("uses the durable rate-limit contract and fails closed on malformed data", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 17 }],
      error: null,
    });
    const repository = createPublicWorkflowRepository({ rpc });

    await expect(
      repository.rateLimiter.consume({
        scope: "contact",
        subjectHash: "a".repeat(64),
        windowSeconds: 60,
        maxAttempts: 3,
      }),
    ).resolves.toEqual({ status: "limited", retryAfterSeconds: 17 });
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_scope: "contact",
      p_subject_hash: "a".repeat(64),
      p_window_seconds: 60,
      p_max_attempts: 3,
    });
  });

  it("persists contact data only through the approved RPC contract", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: uuid }], error: null });
    const repository = createPublicWorkflowRepository({ rpc });

    await expect(
      repository.createContactEnquiry({
        name: "Ada Supporter",
        email: "ada@example.test",
        subject: "Question",
        message: "Please share the process.",
        sourcePage: "/contact",
        consentedAt: "2026-07-30T00:00:00.000Z",
        sourceIpHash: "b".repeat(64),
      }),
    ).resolves.toEqual({ status: "persisted", id: uuid });
    expect(rpc).toHaveBeenCalledWith("create_contact_enquiry", {
      p_name: "Ada Supporter",
      p_email: "ada@example.test",
      p_subject: "Question",
      p_message: "Please share the process.",
      p_source_page: "/contact",
      p_consented_at: "2026-07-30T00:00:00.000Z",
      p_source_ip_hash: "b".repeat(64),
    });
  });

  it("propagates the paired unsubscribe UUID only through service-only RPCs", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ confirmation_token: uuid }], error: null })
      .mockResolvedValueOnce({ data: uuid, error: null })
      .mockResolvedValueOnce({ data: [{ confirmation_token: null }], error: null });
    const repository = createPublicWorkflowRepository({ rpc });
    const record = {
      email: "member@example.test",
      sourcePage: "/",
      sourceIpHash: "c".repeat(64),
    };

    await expect(repository.upsertNewsletterSubscription(record)).resolves.toEqual({
      status: "persisted",
      confirmationToken: uuid,
      unsubscribeToken: uuid,
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "server_resolve_newsletter_unsubscribe_token",
      { p_confirmation_token: uuid },
    );
    await expect(repository.upsertNewsletterSubscription(record)).resolves.toEqual({
      status: "suppressed",
    });
  });

  it("treats unknown and replayed unsubscribe tokens as processed", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    const repository = createPublicWorkflowRepository({ rpc });

    await expect(repository.unsubscribeNewsletterSubscription(uuid)).resolves.toEqual({
      status: "processed",
    });
    await expect(repository.unsubscribeNewsletterSubscription(uuid)).resolves.toEqual({
      status: "processed",
    });
    await expect(repository.unsubscribeNewsletterSubscription(uuid)).resolves.toEqual({
      status: "unavailable",
    });
    expect(rpc).toHaveBeenCalledWith("unsubscribe_newsletter_subscription", {
      p_unsubscribe_token: uuid,
    });
  });
});
