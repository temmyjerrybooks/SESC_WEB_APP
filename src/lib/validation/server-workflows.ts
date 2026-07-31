import { z } from "zod";

import { managedNewsBodySchema } from "@/lib/content/managed-news";
import { maximumPrivateUploadBytes } from "@/lib/storage/private-upload";

const shortText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

export const membershipDraftRequestSchema = z.object({
  intent: z.literal("save"),
  chapterId: z.string().uuid(),
  membershipPlanId: z.string().uuid(),
  firstName: shortText(2, 80),
  lastName: shortText(2, 80),
  dateOfBirth: z.string().date(),
  phone: shortText(7, 32),
  address: shortText(8, 240),
  city: shortText(2, 120),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/),
  emergencyContactName: shortText(2, 80),
  emergencyContactPhone: shortText(7, 32),
  marketingConsent: z.boolean().default(false),
});

export const membershipSubmitRequestSchema = z.object({
  intent: z.literal("submit"),
  applicationId: z.string().uuid(),
  marketingConsent: z.boolean().default(false),
  turnstileToken: z.string().trim().min(1).max(8_192),
});

export const membershipRequestSchema = z.discriminatedUnion("intent", [
  membershipDraftRequestSchema,
  membershipSubmitRequestSchema,
]);

export const privateDocumentPrepareSchema = z.object({
  phase: z.literal("prepare"),
  applicationId: z.string().uuid(),
  kind: z.enum(["profile_photo", "identity_document"]),
  fileName: shortText(1, 180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size: z.number().int().positive().max(maximumPrivateUploadBytes),
});

export const privateDocumentCompleteSchema = z.object({
  phase: z.literal("upload"),
  applicationId: z.string().uuid(),
  intentId: z.string().uuid(),
  kind: z.enum(["profile_photo", "identity_document"]),
});

export const privateDocumentRequestSchema = z.discriminatedUnion("phase", [
  privateDocumentPrepareSchema,
  privateDocumentCompleteSchema,
]);

export const paymentReceiptPrepareSchema = z.object({
  phase: z.literal("prepare"),
  paymentId: z.string().uuid(),
  fileName: shortText(1, 180),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size: z.number().int().positive().max(maximumPrivateUploadBytes),
});

export const paymentReceiptCompleteSchema = z.object({
  phase: z.literal("upload"),
  paymentId: z.string().uuid(),
  intentId: z.string().uuid(),
});

export const paymentReceiptRequestSchema = z.discriminatedUnion("phase", [
  paymentReceiptPrepareSchema,
  paymentReceiptCompleteSchema,
]);

export const applicationReviewRequestSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["under_review", "requires_correction", "approved", "rejected"]),
  notes: z.string().trim().max(2_000).optional(),
});

export const paymentReviewRequestSchema = z.object({
  paymentId: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "needs_resubmission"]),
  notes: z.string().trim().max(2_000).optional(),
});

export const membershipStatusRequestSchema = z.object({
  membershipId: z.string().uuid(),
  status: z.enum(["active", "suspended"]),
  reason: z.string().trim().max(2_000).optional(),
}).superRefine((value, context) => {
  if (value.status === "suspended" && !value.reason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A suspension reason is required.",
      path: ["reason"],
    });
  }
});

const authEmail = z.string().trim().email().max(254);
const authPassword = z.string().min(8).max(256);
const turnstileToken = z.string().trim().min(1).max(8_192);

export const authActionRequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sign-in"), email: authEmail, password: authPassword, turnstileToken }),
  z.object({ action: z.literal("sign-up"), email: authEmail, password: authPassword, fullName: z.string().trim().max(120).optional(), turnstileToken }),
  z.object({ action: z.literal("password-reset"), email: authEmail, turnstileToken }),
  z.object({ action: z.literal("resend-verification"), email: authEmail, turnstileToken }),
  z.object({ action: z.literal("update-password"), password: authPassword }),
]);

export const profileUpdateRequestSchema = z.object({
  givenName: z.string().trim().min(1).max(80).optional(),
  familyName: z.string().trim().min(1).max(80).optional(),
  displayName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(7).max(32).optional(),
  countryCode: z.string().trim().regex(/^[A-Za-z]{2}$/).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "Provide at least one profile field.",
});

export const contentEntryRequestSchema = z.object({
  entryId: z.string().uuid().optional(),
  kind: z.enum(["announcement", "news", "event", "gallery_album", "gallery_media", "sponsor", "partner", "page"]),
  status: z.enum(["draft", "published", "archived"]),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  title: shortText(2, 220),
  summary: z.string().trim().min(1).max(800).optional(),
  body: z.record(z.string(), z.unknown()).default({}),
  coverImagePath: z.string().trim().min(1).max(400).optional(),
  altText: z.string().trim().min(1).max(500).optional(),
  publicationAt: z.string().datetime({ offset: true }).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
}).superRefine((value, context) => {
  if (value.kind === "news" && !managedNewsBodySchema.safeParse(value.body).success) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "News content must use the supported text-only article structure.",
      path: ["body"],
    });
  }

  if (value.status === "published" && value.expiresAt && value.publicationAt) {
    if (Date.parse(value.expiresAt) <= Date.parse(value.publicationAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry must be after publication.",
        path: ["expiresAt"],
      });
    }
  }
});

export const contactEnquiryUpdateRequestSchema = z.object({
  enquiryId: z.string().uuid(),
  status: z.enum(["new", "in_progress", "resolved", "closed"]),
  assignedTo: z.string().uuid().nullable().optional(),
  resolutionNotes: z.string().trim().min(1).max(2_000).nullable().optional(),
});

export const roleInvitationRequestSchema = z.object({
  email: authEmail,
  roleId: z.string().uuid(),
  scopeId: z.string().uuid(),
  expiresAt: z.string().datetime(),
});
