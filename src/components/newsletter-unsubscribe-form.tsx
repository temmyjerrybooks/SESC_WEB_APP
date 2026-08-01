"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isNewsletterUnsubscribeToken } from "@/lib/public-workflows/validation";

type UnsubscribeState = "preparing" | "ready" | "submitting" | "completed" | "error";

/**
 * The email bearer capability lives exclusively in the URL fragment. Fragments
 * are not sent with the page request; this component clears it before a
 * visitor can explicitly POST the token to the server.
 */
export function NewsletterUnsubscribeForm() {
  const [state, setState] = useState<UnsubscribeState>("preparing");
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => {
    const fragment = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const candidate = new URLSearchParams(fragment).get("token");

    if (window.location.hash) {
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    let active = true;
    queueMicrotask(() => {
      if (!active) return;

      if (isNewsletterUnsubscribeToken(candidate)) {
        setToken(candidate);
        setState("ready");
        return;
      }

      // Keep invalid or expired links non-enumerating. A recipient can reopen
      // their mail if they need the one-time browser-held capability again.
      setState("completed");
    });

    return () => {
      active = false;
    };
  }, []);

  const unsubscribe = async () => {
    if (!token) {
      setState("completed");
      return;
    }

    setState("submitting");
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(response.ok ? "completed" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "completed") {
    return (
      <div className="empty-state" role="status">
        <strong>Your newsletter preference has been updated.</strong>
        <p>You will not receive future SESC newsletter updates through this subscription.</p>
        <Link className="button button--ghost" href="/">Return home</Link>
      </div>
    );
  }

  return (
    <div className="form-card" aria-busy={state === "preparing" || state === "submitting"}>
      <p className="eyebrow">Newsletter preferences</p>
      <h1 className="page-title">Unsubscribe from updates</h1>
      <p className="page-summary">Confirm only if you want to stop receiving SESC newsletter updates.</p>
      {state === "error" ? <p className="field-error" role="alert">We could not update your preference. Please try again later.</p> : null}
      <button className="button button--primary" disabled={state !== "ready"} onClick={unsubscribe} type="button">
        {state === "submitting" ? "Updating..." : "Unsubscribe"}
      </button>
    </div>
  );
}
