import { createHash } from "node:crypto";

function isIpv4(value: string): boolean {
  const parts = value.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
  );
}

function isIpv6(value: string): boolean {
  return value.length <= 45 && value.includes(":") && /^[0-9a-fA-F:]+$/.test(value);
}

function validAddress(value: string | null): string | undefined {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 45) return undefined;
  return isIpv4(candidate) || isIpv6(candidate) ? candidate : undefined;
}

/**
 * Forwarded address headers are attacker-controlled unless the deployment
 * platform strips and repopulates them. Callers must opt in only when that
 * proxy boundary is configured and documented for the environment.
 */
export function readClientAddress(
  headers: Headers,
  trustedProxyHeaders = false,
): string | undefined {
  if (!trustedProxyHeaders) return undefined;

  const vercel = validAddress(headers.get("x-vercel-forwarded-for"));
  if (vercel) return vercel;

  const cloudflare = validAddress(headers.get("cf-connecting-ip"));
  if (cloudflare) return cloudflare;

  const realIp = validAddress(headers.get("x-real-ip"));
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for")?.split(",")[0];
  return validAddress(forwarded ?? null);
}

/** Never persist or send the raw visitor address to the rate-limit store. */
export function hashClientAddress(scope: string, address: string): string {
  return createHash("sha256")
    .update(`sesc-public-workflow:${scope}:${address}`)
    .digest("hex");
}
