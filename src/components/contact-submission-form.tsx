"use client";

import { type FormEvent, useCallback, useState } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";

export function ContactSubmissionForm({ siteKey }: { siteKey: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const onToken = useCallback((value: string | null) => setToken(value), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage(null);
    if (!token) {
      setMessage("Complete the security check before sending your message.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          subject: form.get("subject"),
          message: form.get("message"),
          sourcePage: "/contact",
          turnstileToken: token,
          website: form.get("website"),
        }),
      });
      const body = await response.json().catch(() => ({}));
      setMessage(typeof body.message === "string" ? body.message : "We could not process that request.");
      if (response.ok) event.currentTarget.reset();
    } catch {
      setMessage("We could not process that request. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field"><label htmlFor="contact-name">Name</label><input autoComplete="name" disabled={submitting} id="contact-name" name="name" required /></div>
      <div className="field"><label htmlFor="contact-email">Email address</label><input autoComplete="email" disabled={submitting} id="contact-email" name="email" required type="email" /></div>
      <div className="field full"><label htmlFor="contact-subject">Subject</label><input disabled={submitting} id="contact-subject" name="subject" required /></div>
      <div className="field full"><label htmlFor="contact-message">Message</label><textarea disabled={submitting} id="contact-message" name="message" required rows={6} /></div>
      <input aria-hidden="true" autoComplete="off" className="sr-only" name="website" tabIndex={-1} type="text" />
      <div className="full"><TurnstileWidget action="sesc_contact" disabled={submitting} onToken={onToken} siteKey={siteKey} /></div>
      {message ? <p className="field-error full" role="status">{message}</p> : null}
      <div className="button-row full"><button className="button button--primary" disabled={submitting} type="submit">{submitting ? "Sending…" : "Send message"}</button></div>
    </form>
  );
}
