"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { safeRelativePath } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/client";

export type AuthFormMode =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "email-verification";

type Notice = {
  tone: "error" | "success" | "info";
  message: string;
};

const copy: Record<AuthFormMode, { eyebrow: string; title: string; summary: string }> = {
  login: {
    eyebrow: "Member access",
    title: "Welcome back.",
    summary: "Sign in to continue to your member space.",
  },
  register: {
    eyebrow: "Create an account",
    title: "Start your member account.",
    summary: "Create a secure account before beginning or managing your membership journey.",
  },
  "forgot-password": {
    eyebrow: "Password recovery",
    title: "Reset your password.",
    summary: "We will send a private password-reset link to your email address.",
  },
  "reset-password": {
    eyebrow: "Choose a new password",
    title: "Secure your account.",
    summary: "Choose a new password for your SESC account.",
  },
  "email-verification": {
    eyebrow: "Verify your email",
    title: "Confirm your email address.",
    summary: "Use the link in your email to activate your account. You can request a fresh link below.",
  },
};

function safeErrorMessage(error: unknown, action: AuthFormMode): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) {
    return "We could not sign you in with those details.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }

  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Please wait a moment before requesting another email.";
  }

  if (message.includes("password") && message.includes("least")) {
    return "Choose a password that meets the required length.";
  }

  if (message.includes("session") || message.includes("jwt")) {
    return "This link is no longer valid. Request a new password-reset email and try again.";
  }

  if (action === "forgot-password" || action === "email-verification") {
    return "We could not send that email just now. Please try again shortly.";
  }

  return "We could not complete that request. Please try again.";
}

function PreviewNotice() {
  return (
    <div className="empty-state" role="status">
      <strong>Development preview</strong>
      <p>
        Account actions are unavailable in this environment. They require public Supabase configuration and an
        explicit approved enablement flag; no sign-in or email request will be sent from this preview.
      </p>
    </div>
  );
}

function EmailField({
  email,
  onChange,
  disabled,
}: {
  email: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="field full">
      <label htmlFor="auth-email">Email address</label>
      <input
        autoComplete="email"
        disabled={disabled}
        id="auth-email"
        inputMode="email"
        onChange={(event) => onChange(event.target.value)}
        required
        type="email"
        value={email}
      />
    </div>
  );
}

function PasswordFields({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  disabled,
  confirmation = false,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  disabled: boolean;
  confirmation?: boolean;
}) {
  return (
    <>
      <div className="field full">
        <label htmlFor="auth-password">Password</label>
        <input
          autoComplete={confirmation ? "new-password" : "current-password"}
          disabled={disabled}
          id="auth-password"
          minLength={8}
          onChange={(event) => onPasswordChange(event.target.value)}
          required
          type="password"
          value={password}
        />
        {confirmation && <small>Use at least 8 characters and do not reuse a password from another service.</small>}
      </div>
      {confirmation && (
        <div className="field full">
          <label htmlFor="auth-password-confirmation">Confirm password</label>
          <input
            autoComplete="new-password"
            disabled={disabled}
            id="auth-password-confirmation"
            minLength={8}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </div>
      )}
    </>
  );
}

export function AuthForm({
  enabled,
  mode,
  turnstileSiteKey,
}: {
  enabled: boolean;
  mode: AuthFormMode;
  turnstileSiteKey?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = enabled;
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined" || mode !== "email-verification") {
      return "";
    }

    try {
      return window.sessionStorage.getItem("sesc-auth-email") ?? "";
    } catch {
      return "";
    }
  });
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(mode !== "reset-password");
  const [recoveryReady, setRecoveryReady] = useState(mode !== "reset-password");
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const content = copy[mode];
  const disabled = !configured || submitting;
  const resetUnavailable = mode === "reset-password" && recoveryChecked && !recoveryReady && !passwordUpdated;
  const resetInputsDisabled =
    disabled || (mode === "reset-password" && (!recoveryChecked || resetUnavailable || passwordUpdated));
  const requestedDestination = searchParams.get("next");
  const postSignInDestination = safeRelativePath(requestedDestination, "/member");
  const handleTurnstileToken = useCallback((token: string | null) => {
    setTurnstileToken(token);
  }, []);

  useEffect(() => {
    if (!configured || (mode !== "reset-password" && mode !== "email-verification")) {
      return;
    }

    const supabase = createClient();
    let active = true;

    const inspectSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      if (mode === "reset-password") {
        setRecoveryReady(Boolean(data.session));
        setRecoveryChecked(true);
        if (error) {
          setNotice({
            tone: "error",
            message: "This link is no longer valid. Request a new password-reset email and try again.",
          });
        }
        return;
      }

      const user = data.session?.user;
      if (user && Boolean(user.email_confirmed_at ?? user.confirmed_at)) {
        setVerificationComplete(true);
        setNotice({ tone: "success", message: "Your email address has been verified. You can now continue." });
      }
    };

    void inspectSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }

      if (mode === "reset-password") {
        if (event === "PASSWORD_RECOVERY" || session) {
          setRecoveryReady(Boolean(session));
          setRecoveryChecked(true);
        }
        return;
      }

      if (session?.user && Boolean(session.user.email_confirmed_at ?? session.user.confirmed_at)) {
        setVerificationComplete(true);
        setNotice({ tone: "success", message: "Your email address has been verified. You can now continue." });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, mode]);

  const rememberEmail = (value: string) => {
    try {
      window.sessionStorage.setItem("sesc-auth-email", value);
    } catch {
      // Remembering the address is a convenience only.
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);

    if (!configured) {
      return;
    }

    if ((mode === "register" || mode === "reset-password") && password !== confirmPassword) {
      setNotice({ tone: "error", message: "The passwords do not match." });
      return;
    }

    if (mode === "reset-password" && !recoveryReady) {
      setNotice({
        tone: "error",
        message: "This link is no longer valid. Request a new password-reset email and try again.",
      });
      return;
    }

    if (mode !== "reset-password" && (!turnstileSiteKey || !turnstileToken)) {
      setNotice({
        tone: "error",
        message: "Complete the security check before continuing.",
      });
      return;
    }

    setSubmitting(true);
    const normalisedEmail = email.trim().toLowerCase();

    try {
      const action = {
        login: "sign-in",
        register: "sign-up",
        "forgot-password": "password-reset",
        "reset-password": "update-password",
        "email-verification": "resend-verification",
      }[mode];
      const body = mode === "reset-password"
        ? { password }
        : {
            email: normalisedEmail,
            ...(mode === "login" || mode === "register" ? { password } : {}),
            ...(mode === "register" && fullName.trim() ? { fullName: fullName.trim() } : {}),
            turnstileToken,
          };
      const response = await fetch(`/api/auth/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof result.message === "string" ? result.message : "Request failed");
      }

      if (mode === "login") {
        router.replace(postSignInDestination);
        router.refresh();
        return;
      }

      if (mode === "register") {
        rememberEmail(normalisedEmail);
        if (response.headers.get("x-sesc-auth-session") === "created") {
          router.replace(postSignInDestination);
          router.refresh();
        } else {
          router.push("/email-verification");
        }
        return;
      }

      if (mode === "forgot-password") {
        setNotice({
          tone: "success",
          message: "If an account matches that email address, a password-reset link is on its way.",
        });
        return;
      }

      if (mode === "reset-password") {
        setRecoveryReady(false);
        setPasswordUpdated(true);
        setNotice({
          tone: "success",
          message: "Your password has been updated. Sign in with your new password to continue.",
        });
        return;
      }

      rememberEmail(normalisedEmail);
      setNotice({
        tone: "success",
        message: "If that account is eligible for verification, a fresh confirmation link is on its way.",
      });
    } catch (error) {
      setNotice({ tone: "error", message: safeErrorMessage(error, mode) });
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = {
    login: "Sign in",
    register: "Create account",
    "forgot-password": "Send reset link",
    "reset-password": "Update password",
    "email-verification": "Resend verification email",
  }[mode];

  return (
    <div className="form-card">
      <p className="eyebrow">{content.eyebrow}</p>
      <h1 className="page-title">{content.title}</h1>
      <p className="page-summary">{content.summary}</p>

      {!configured && <PreviewNotice />}

      {verificationComplete && mode === "email-verification" ? (
        <div className="empty-state" role="status">
          <strong>Your account is ready.</strong>
          <p>Your email is confirmed and your account can now be used to access member services.</p>
          <Link className="button button--primary" href="/login">
            Continue to sign in
          </Link>
        </div>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
          {mode === "register" && (
            <div className="field full">
              <label htmlFor="auth-full-name">Full name <small>(optional)</small></label>
              <input
                autoComplete="name"
                disabled={disabled}
                id="auth-full-name"
                onChange={(event) => setFullName(event.target.value)}
                value={fullName}
              />
            </div>
          )}

          {(mode === "login" || mode === "register" || mode === "forgot-password" || mode === "email-verification") && (
            <EmailField disabled={disabled} email={email} onChange={setEmail} />
          )}

          {(mode === "login" || mode === "register" || mode === "reset-password") && (
            <PasswordFields
              confirmation={mode !== "login"}
              confirmPassword={confirmPassword}
              disabled={resetInputsDisabled}
              onConfirmPasswordChange={setConfirmPassword}
              onPasswordChange={setPassword}
              password={password}
            />
          )}

          {mode === "reset-password" && !recoveryChecked && configured && (
            <div className="empty-state full" role="status">Checking your recovery link…</div>
          )}

          {resetUnavailable && (
            <div className="empty-state full" role="status">
              <strong>This recovery link is unavailable.</strong>
              <p>Recovery links expire for your protection. Request a new one to set a password.</p>
              <Link className="button button--ghost" href="/forgot-password">Request a new link</Link>
            </div>
          )}

          {notice && (
            <div className="empty-state full" role={notice.tone === "error" ? "alert" : "status"}>
              {notice.message}
            </div>
          )}

          {mode !== "reset-password" && configured && turnstileSiteKey ? (
            <TurnstileWidget
              action={`sesc_${mode.replaceAll("-", "_")}`}
              disabled={submitting}
              onToken={handleTurnstileToken}
              siteKey={turnstileSiteKey}
            />
          ) : null}

          <div className="button-row full">
            <button
              className="button button--primary"
              disabled={disabled || resetUnavailable || passwordUpdated || (mode === "reset-password" && !recoveryChecked)}
              type="submit"
            >
              {submitting ? "Please wait…" : passwordUpdated ? "Password updated" : submitLabel}
            </button>
          </div>
        </form>
      )}

      <div className="action-row">
        {mode === "login" && <Link className="button button--ghost" href="/forgot-password">Forgot password?</Link>}
        {mode === "login" && <Link className="button button--ghost" href="/register">Create an account</Link>}
        {mode === "register" && <Link className="button button--ghost" href="/login">Already have an account?</Link>}
        {mode === "forgot-password" && <Link className="button button--ghost" href="/login">Back to sign in</Link>}
        {mode === "reset-password" && <Link className="button button--ghost" href="/login">Back to sign in</Link>}
        {mode === "email-verification" && !verificationComplete && <Link className="button button--ghost" href="/login">Back to sign in</Link>}
      </div>
    </div>
  );
}
