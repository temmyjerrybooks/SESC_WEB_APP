import { z } from "zod";

export const newsletterSubscriptionSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  sourcePage: z.string().trim().max(160).optional(),
  turnstileToken: z.string().trim().max(8_192).optional(),
});

export type NewsletterSubscriptionInput = z.infer<typeof newsletterSubscriptionSchema>;

export function normalizeNewsletterEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidUnsubscribeToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,128}$/.test(token);
}
