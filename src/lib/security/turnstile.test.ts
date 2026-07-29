import { describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "./turnstile";

describe("Turnstile verification", () => {
  it("fails closed before a token and server secret exist", async () => {
    const fetcher = vi.fn();

    await expect(verifyTurnstile(undefined, undefined, undefined, fetcher)).resolves.toEqual({
      status: "unavailable",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the verification only server-side and returns a non-sensitive state", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await expect(
      verifyTurnstile("token", "secret", "127.0.0.1", fetcher),
    ).resolves.toEqual({ status: "passed" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
