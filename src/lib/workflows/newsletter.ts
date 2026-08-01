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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
}
