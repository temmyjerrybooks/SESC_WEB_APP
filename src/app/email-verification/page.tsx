import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Verify the email address for your Super Eagles Supporters Club account.",
};

export default function EmailVerificationPage() {
  return <AuthPage mode="email-verification" />;
}
