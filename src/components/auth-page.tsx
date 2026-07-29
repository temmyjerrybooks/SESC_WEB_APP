import { Suspense } from "react";
import { AuthForm, type AuthFormMode } from "@/components/auth-form";
import { isFeatureEnabled } from "@/lib/environment/server";
import { isAuthActionsEnabled } from "@/lib/supabase/config";

export function AuthPage({ mode }: { mode: AuthFormMode }) {
  const authEnabled = isFeatureEnabled("authentication") && isAuthActionsEnabled();

  return (
    <section className="section section--tight">
      <div className="page-shell">
        <div style={{ maxWidth: "42rem" }}>
          <Suspense fallback={<div className="empty-state" role="status">Loading account form...</div>}>
            <AuthForm enabled={authEnabled} mode={mode} />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
