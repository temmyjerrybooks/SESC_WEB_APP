export type TurnstileVerification = {
  status: "passed" | "failed" | "unavailable";
};

type TurnstileResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

export type TurnstileExpectation = {
  expectedAction?: string;
  expectedHostname?: string;
};

type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{ ok: boolean; json: () => Promise<TurnstileResponse> }>;

/**
 * Server-only callers should invoke this before reading or persisting a
 * public form. It intentionally returns no provider diagnostics to callers.
 */
export async function verifyTurnstile(
  token: string | undefined,
  secret: string | undefined,
  remoteIp: string | undefined,
  expectationOrFetcher?: TurnstileExpectation | FetchLike,
  suppliedFetcher?: FetchLike,
): Promise<TurnstileVerification> {
  if (!token?.trim() || !secret?.trim()) {
    return { status: "unavailable" };
  }

  const expectation = typeof expectationOrFetcher === "function"
    ? undefined
    : expectationOrFetcher;
  const fetcher = (typeof expectationOrFetcher === "function"
    ? expectationOrFetcher
    : suppliedFetcher) ?? fetch;

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetcher(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
    );
    if (!response.ok) {
      return { status: "failed" };
    }

    const result = await response.json();
    if (!result.success) return { status: "failed" };
    if (expectation?.expectedAction && result.action !== expectation.expectedAction) {
      return { status: "failed" };
    }
    if (
      expectation?.expectedHostname &&
      result.hostname?.toLowerCase() !== expectation.expectedHostname.toLowerCase()
    ) {
      return { status: "failed" };
    }
    return { status: "passed" };
  } catch {
    return { status: "failed" };
  }
}

export function turnstileHostnameFromSiteUrl(siteUrl: string | undefined): string | undefined {
  try {
    return siteUrl ? new URL(siteUrl).hostname.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}
