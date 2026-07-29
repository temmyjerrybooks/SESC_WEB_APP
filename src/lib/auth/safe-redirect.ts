const unsafePathPattern = /[\\\u0000-\u001f]/;

/**
 * Keeps auth return destinations local. Query parameters, protocol-relative
 * values, backslashes, and control characters are rejected to prevent open
 * redirects after sign-in, verification, or sign-out.
 */
export function safeRelativePath(value: string | null | undefined, fallback = "/member"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || unsafePathPattern.test(value)) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://sesc.invalid");
    return parsed.origin === "https://sesc.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    return fallback;
  }
}
