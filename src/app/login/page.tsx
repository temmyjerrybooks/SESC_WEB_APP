import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Super Eagles Supporters Club account.",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
