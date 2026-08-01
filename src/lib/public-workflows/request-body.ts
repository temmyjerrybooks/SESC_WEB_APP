export type BoundedJsonResult =
  | { status: "parsed"; value: unknown }
  | { status: "invalid" };

function hasJsonContentType(request: Request): boolean {
  return request.headers
    .get("content-type")
    ?.toLowerCase()
    .split(";", 1)[0]
    ?.trim() === "application/json";
}

/**
 * Parses a small JSON request without allowing a chunked body to bypass the
 * endpoint limit. Routes call this only after feature and rate-limit checks.
 */
export async function readBoundedJson(
  request: Request,
  maxBytes: number,
): Promise<BoundedJsonResult> {
  if (!hasJsonContentType(request) || !Number.isInteger(maxBytes) || maxBytes < 1) {
    return { status: "invalid" };
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes)) {
    return { status: "invalid" };
  }

  const reader = request.body?.getReader();
  if (!reader) return { status: "invalid" };

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { status: "invalid" };
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();

    return { status: "parsed", value: JSON.parse(body) };
  } catch {
    return { status: "invalid" };
  } finally {
    reader.releaseLock();
  }
}
