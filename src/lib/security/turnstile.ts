export type TurnstileVerification = {
  status: "passed" | "failed" | "unavailable";
};

type TurnstileResponse = {
  success?: boolean;
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
  fetcher: FetchLike = fetch,
): Promise<TurnstileVerification> {
  if (!token?.trim() || !secret?.trim()) {
    return { status: "unavailable" };
  }

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

    return (await response.json()).success
      ? { status: "passed" }
      : { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}
