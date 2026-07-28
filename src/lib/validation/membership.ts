import { z } from "zod";

const name = z.string().trim().min(2, "Enter at least 2 characters.").max(80, "Keep this under 80 characters.");
const optionalName = z.string().trim().max(80).optional().or(z.literal(""));

export const membershipApplicationSchema = z.object({
  firstName: name,
  lastName: name,
  otherNames: optionalName,
  dateOfBirth: z.string().min(1, "Select your date of birth."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().min(7, "Enter a valid phone number.").max(32),
  address: z.string().trim().min(8, "Enter your residential address.").max(240),
  city: name,
  country: name,
  nationality: name,
  chapterScope: z.enum(["nigeria", "international"], { message: "Choose a chapter location." }),
  chapter: z.string().trim().min(2, "Choose or enter a chapter.").max(120),
  membershipCategory: z.enum(["standard", "elite", "family", "student"], { message: "Choose a membership category." }),
  profilePhotoName: z.string().trim().min(1, "Attach a profile photograph."),
  identityDocumentName: z.string().trim().min(1, "Attach an identification document."),
  emergencyContactName: name,
  emergencyContactPhone: z.string().trim().min(7, "Enter a valid emergency phone number.").max(32),
  paymentMethod: z.literal("manual_bank_transfer"),
  paymentReference: z.string().trim().min(4, "Enter the bank-payment reference.").max(80),
  declaration: z.boolean().refine((value) => value, { message: "You must confirm the declaration before submitting." }),
  marketingConsent: z.boolean(),
});

export type MembershipApplicationInput = z.infer<typeof membershipApplicationSchema>;

export const membershipCategories = [
  { value: "standard", label: "Standard supporter", description: "The core verified supporter membership." },
  { value: "elite", label: "Elite supporter", description: "A premium category subject to approved club terms." },
  { value: "family", label: "Family membership", description: "A family category subject to approved eligibility rules." },
  { value: "student", label: "Student supporter", description: "A student category subject to approved verification." },
] as const;
