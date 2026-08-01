import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Super Eagles Supporters Club account.",
};

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return <AuthPage mode="reset-password" />;
}
