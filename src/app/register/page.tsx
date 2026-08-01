import type { Metadata } from "next";
import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a secure Super Eagles Supporters Club account.",
};

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <AuthPage mode="register" />;
}
