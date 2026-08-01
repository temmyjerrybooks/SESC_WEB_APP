export type RateLimitRequest = {
  scope: string;
  subjectHash: string;
  windowSeconds: number;
  maxAttempts: number;
};

export type RateLimitDecision =
  | { status: "allowed"; remaining: number }
  | { status: "limited"; retryAfterSeconds: number }
  | { status: "unavailable" };

/**
 * Public routes receive this abstraction rather than coupling their abuse
 * controls to a deployment provider. Production runtime code uses the
 * trusted Supabase RPC adapter; the in-memory implementation exists only for
 * deterministic unit tests and single-process local exercises.
 */
export interface RateLimiter {
  consume(request: RateLimitRequest): Promise<RateLimitDecision>;
}

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type Clock = () => number;

function isValidRequest(request: RateLimitRequest): boolean {
  return Boolean(
    request.scope.trim() &&
      request.subjectHash.trim() &&
      Number.isInteger(request.windowSeconds) &&
      request.windowSeconds > 0 &&
      Number.isInteger(request.maxAttempts) &&
      request.maxAttempts > 0,
  );
}

/**
 * A bounded, testable fallback implementation. Do not instantiate this in a
 * horizontally scaled production route: each instance would have independent
 * counters. Runtime code deliberately uses a durable RPC-backed limiter.
 */
export function createInMemoryRateLimiter(
  now: Clock = Date.now,
): RateLimiter {
  const entries = new Map<string, RateLimitEntry>();

  return {
    async consume(request) {
      if (!isValidRequest(request)) {
        return { status: "unavailable" };
      }

      const currentTime = now();
      const key = `${request.scope}:${request.subjectHash}`;
      const existing = entries.get(key);
      const windowMilliseconds = request.windowSeconds * 1_000;

      if (!existing || existing.resetAt <= currentTime) {
        entries.set(key, { count: 1, resetAt: currentTime + windowMilliseconds });
        return { status: "allowed", remaining: request.maxAttempts - 1 };
      }

      if (existing.count >= request.maxAttempts) {
        return {
          status: "limited",
          retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1_000)),
        };
      }

      existing.count += 1;
      return {
        status: "allowed",
        remaining: Math.max(0, request.maxAttempts - existing.count),
      };
    },
  };
}

/** A route must not accept public data when its limiter is unavailable. */
export const unavailableRateLimiter: RateLimiter = {
  async consume() {
    return { status: "unavailable" };
  },
};
