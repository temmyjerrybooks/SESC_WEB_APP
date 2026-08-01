import { describe, expect, it } from "vitest";

import { hashClientAddress, readClientAddress } from "./client-identity";

describe("public workflow client identity", () => {
  it("prefers Cloudflare's address and only produces a non-reversible hash", () => {
    const address = readClientAddress(
      new Headers({
        "cf-connecting-ip": "203.0.113.42",
        "x-forwarded-for": "198.51.100.10",
      }),
      true,
    );

    expect(address).toBe("203.0.113.42");
    expect(hashClientAddress("contact", address!)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashClientAddress("contact", address!)).not.toBe(
      hashClientAddress("newsletter", address!),
    );
  });

  it("fails closed when no valid proxy address is supplied", () => {
    expect(readClientAddress(new Headers({ "x-forwarded-for": "unknown" }), true)).toBeUndefined();
    expect(readClientAddress(new Headers({ "x-real-ip": "999.1.1.1" }), true)).toBeUndefined();
    expect(readClientAddress(new Headers({ "cf-connecting-ip": "203.0.113.42" }))).toBeUndefined();
  });
});
