"use client";

import { useState } from "react";

export function NewsletterConfirmationForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "submitting" | "confirmed" | "error">("idle");

  const confirm = async () => {
    setState("submitting");
    try {
      const response = await fetch("/api/newsletter/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(response.ok ? "confirmed" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "confirmed") {
    return <p className="empty-state" role="status">Your newsletter preference has been confirmed.</p>;
  }

  return (
    <div className="form-card">
      <p className="eyebrow">Newsletter confirmation</p>
      <h1 className="page-title">Confirm your subscription</h1>
      <p className="page-summary">Confirm only if you requested updates from Super Eagles Supporters Club.</p>
      {state === "error" ? <p className="field-error" role="alert">This confirmation link is unavailable or has already been used.</p> : null}
      <button className="button button--primary" disabled={state === "submitting"} onClick={confirm} type="button">
        {state === "submitting" ? "Confirming…" : "Confirm subscription"}
      </button>
    </div>
  );
}
