import { Suspense } from "react";
import { AuthForm, type AuthFormMode } from "@/components/auth-form";

export function AuthPage({ mode }: { mode: AuthFormMode }) {
  return (
    <section className="section section--tight">
      <div className="page-shell">
        <div style={{ maxWidth: "42rem" }}>
          <Suspense fallback={<div className="empty-state" role="status">Loading account form...</div>}>
            <AuthForm mode={mode} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
