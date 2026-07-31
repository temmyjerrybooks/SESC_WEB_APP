import { describe, expect, it } from "vitest";

import { paymentReceiptRequestSchema } from "./server-workflows";

const paymentId = "11111111-1111-4111-8111-111111111111";
const uploadIntentId = "22222222-2222-4222-8222-222222222222";

describe("payment receipt request validation", () => {
  it("accepts the bounded prepare and server-proxied upload phases", () => {
    expect(paymentReceiptRequestSchema.safeParse({
      phase: "prepare",
      paymentId,
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      size: 4_096,
    }).success).toBe(true);

    expect(paymentReceiptRequestSchema.safeParse({
      phase: "upload",
      paymentId,
      intentId: uploadIntentId,
    }).success).toBe(true);
  });

  it("rejects obsolete signed-upload metadata and malformed receipt metadata", () => {
    expect(paymentReceiptRequestSchema.safeParse({
      phase: "upload",
      paymentId,
      bucketId: "member-private",
      storagePath: "receipts/obsolete-path",
    }).success).toBe(false);

    expect(paymentReceiptRequestSchema.safeParse({
      phase: "prepare",
      paymentId: "not-a-uuid",
      fileName: "receipt.pdf",
      mimeType: "application/octet-stream",
      size: 0,
    }).success).toBe(false);
  });
});
