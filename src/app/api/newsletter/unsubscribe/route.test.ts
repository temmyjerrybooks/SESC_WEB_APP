import { beforeEach, describe, expect, it, vi } from "vitest";

const { getNewsletterUnsubscribeRuntime } = vi.hoisted(() => ({
  getNewsletterUnsubscribeRuntime: vi.fn(),
}));

vi.mock("@/lib/public-workflows/runtime", () => ({
  getNewsletterUnsubscribeRuntime,
}));

vi.mock("@/lib/server/http", () => ({
  noStoreJson: (body: Record<string, unknown>, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    }),
  unavailable: (message = "This service is not available in the current environment.") =>
    Response.json({ message }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    }),
}));

import { POST } from "./route";

const token = "11111111-1111-4111-8111-111111111111";

describe("POST /api/newsletter/unsubscribe", () => {
  const unsubscribeNewsletterSubscription = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeNewsletterSubscription.mockResolvedValue({ status: "processed" });
    getNewsletterUnsubscribeRuntime.mockReturnValue({
      repository: { unsubscribeNewsletterSubscription },
    });
  });

  it("acknowledges a valid token without exposing whether it matched a subscriber", async () => {
    const response = await POST(
      new Request("https://sesc.example.test/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      message: "Your newsletter preference has been updated.",
    });
    expect(unsubscribeNewsletterSubscription).toHaveBeenCalledWith(token);
  });

  it("uses the identical success response for malformed tokens", async () => {
    const response = await POST(
      new Request("https://sesc.example.test/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "invalid" }),
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      message: "Your newsletter preference has been updated.",
    });
    expect(unsubscribeNewsletterSubscription).not.toHaveBeenCalled();
  });

  it("fails safely when the server-only preference runtime is unavailable", async () => {
    getNewsletterUnsubscribeRuntime.mockReturnValue(undefined);

    const response = await POST(
      new Request("https://sesc.example.test/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "Newsletter preference management is temporarily unavailable.",
    });
    expect(unsubscribeNewsletterSubscription).not.toHaveBeenCalled();
  });
});
