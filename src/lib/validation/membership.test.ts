import { describe, expect, it } from "vitest";

import { membershipApplicationSchema } from "./membership";

const validApplication = {
  firstName: "Ada",
  lastName: "Okafor",
  otherNames: "Nkem",
  dateOfBirth: "1994-05-12",
  email: "ada.okafor@example.test",
  phone: "+2348012345678",
  address: "12 Example Street, Victoria Island",
  city: "Lagos",
  country: "Nigeria",
  nationality: "Nigerian",
  chapterScope: "nigeria",
  chapter: "Lagos State Chapter",
  membershipCategory: "standard",
  profilePhotoName: "ada-profile.jpg",
  identityDocumentName: "ada-id.pdf",
  emergencyContactName: "Chika Okafor",
  emergencyContactPhone: "+2348098765432",
  paymentMethod: "manual_bank_transfer",
  paymentReference: "BANK-REF-2026-01",
  declaration: true,
  marketingConsent: false,
} as const;

describe("membershipApplicationSchema", () => {
  it("accepts a complete manual-bank-transfer application", () => {
    const result = membershipApplicationSchema.safeParse(validApplication);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBe("manual_bank_transfer");
      expect(result.data.email).toBe("ada.okafor@example.test");
    }
  });

  it("requires the applicant declaration", () => {
    const result = membershipApplicationSchema.safeParse({
      ...validApplication,
      declaration: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.declaration).toContain(
        "You must confirm the declaration before submitting.",
      );
    }
  });
});
