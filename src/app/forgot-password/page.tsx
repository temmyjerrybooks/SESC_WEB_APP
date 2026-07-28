import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a secure password-reset link for your Super Eagles Supporters Club account.",
};

export default function ForgotPasswordPage() {
  return <AuthPage mode="forgot-password" />;
}
