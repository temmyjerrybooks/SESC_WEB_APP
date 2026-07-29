import { describe, expect, it } from "vitest";

import { createPrivateObjectPath, validatePrivateUpload } from "./private-upload";

describe("private upload validation", () => {
  it("accepts an approved image with matching magic bytes", () => {
    expect(validatePrivateUpload({
      kind: "profile_photo",
      fileName: "portrait.JPG",
      mimeType: "image/jpeg",
      size: 200_000,
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    })).toEqual({ ok: true, normalizedExtension: "jpg" });
  });

  it("rejects spoofed types, oversized files, and unsafe paths", () => {
    expect(validatePrivateUpload({
      kind: "identity_document",
      fileName: "identity.pdf",
      mimeType: "application/pdf",
      size: 100,
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
    }).ok).toBe(false);
    expect(validatePrivateUpload({
      kind: "payment_receipt",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      size: 6 * 1024 * 1024,
    }).ok).toBe(false);
    expect(() => createPrivateObjectPath("not-a-uuid", "identity_document", "11111111-1111-4111-8111-111111111111")).toThrow();
  });

  it("uses user-owned, UUID-randomised private storage paths", () => {
    expect(createPrivateObjectPath(
      "11111111-1111-4111-8111-111111111111",
      "payment_receipt",
      "22222222-2222-4222-8222-222222222222",
    )).toBe("receipts/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222");
    expect(createPrivateObjectPath(
      "11111111-1111-4111-8111-111111111111",
      "identity_document",
      "22222222-2222-4222-8222-222222222222",
    )).toBe("private/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222");
  });
});
