import { describe, expect, it } from "vitest";

import { createInMemoryRateLimiter, unavailableRateLimiter } from "./rate-limit";

describe("public workflow rate limiting", () => {
  it("limits a subject within one fixed window and resets after it expires", async () => {
    let now = 1_000;
    const limiter = createInMemoryRateLimiter(() => now);
    const request = {
      scope: "contact",
      subjectHash: "a".repeat(64),
      maxAttempts: 2,
      windowSeconds: 60,
    };

    await expect(limiter.consume(request)).resolves.toEqual({
      status: "allowed",
      remaining: 1,
    });
    await expect(limiter.consume(request)).resolves.toEqual({
      status: "allowed",
      remaining: 0,
    });
    await expect(limiter.consume(request)).resolves.toEqual({
      status: "limited",
      retryAfterSeconds: 60,
    });

    now += 60_000;
    await expect(limiter.consume(request)).resolves.toEqual({
      status: "allowed",
      remaining: 1,
    });
  });

  it("fails closed for malformed settings and unavailable adapters", async () => {
    const limiter = createInMemoryRateLimiter();

    await expect(
      limiter.consume({
        scope: "",
        subjectHash: "hash",
        maxAttempts: 0,
        windowSeconds: 0,
      }),
    ).resolves.toEqual({ status: "unavailable" });
    await expect(
      unavailableRateLimiter.consume({
        scope: "contact",
        subjectHash: "hash",
        maxAttempts: 1,
        windowSeconds: 60,
      }),
    ).resolves.toEqual({ status: "unavailable" });
  });
});
