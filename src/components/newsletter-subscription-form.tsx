"use client";

import { type FormEvent, useCallback, useState } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";

export function NewsletterSubscriptionForm({ siteKey }: { siteKey: string }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const onToken = useCallback((value: string | null) => setToken(value), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!token) {
      setMessage("Complete the security check before subscribing.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, sourcePage: "/", turnstileToken: token }),
      });
      const body = await response.json().catch(() => ({}));
      setMessage(typeof body.message === "string" ? body.message : "We could not process that request.");
      if (response.ok) setEmail("");
    } catch {
      setMessage("We could not process that request. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form aria-label="Newsletter subscription" className="newsletter-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="newsletter-email">Email address</label>
      <input autoComplete="email" disabled={submitting} id="newsletter-email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} />
      <input aria-hidden="true" autoComplete="off" className="sr-only" name="website" tabIndex={-1} type="text" />
      <div className="w-full">
        <TurnstileWidget action="sesc_newsletter" disabled={submitting} onToken={onToken} siteKey={siteKey} />
      </div>
      <button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Submitting…" : "Subscribe"}</button>
      {message ? <p className="newsletter-form__notice w-full" role="status">{message}</p> : null}
    </form>
  );
}
