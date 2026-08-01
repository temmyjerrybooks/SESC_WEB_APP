"use client";

import { useState } from "react";

type ApplicationItem = {
  applicationId: string;
  referenceCode: string;
  status: string;
};

type ReviewDocument = {
  documentId: string;
  kind: "profile_photo" | "identity_document";
  status: "pending" | "verified";
};

type PaymentItem = {
  paymentId: string;
  paymentReference: string;
  applicationReference: string;
  amountMinor: number;
  currency: string;
  status: string;
  receiptReceived: boolean;
  submittedAt: string | null;
};

type Decision = "under_review" | "requires_correction" | "approved" | "rejected";
type PaymentDecision = "approved" | "rejected" | "needs_resubmission";

function messageFrom(body: unknown, fallback: string) {
  return body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallback;
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

function openSignedUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const popup = window.open(url.toString(), "_blank", "noopener,noreferrer");
    if (popup) popup.opener = null;
    return Boolean(popup);
  } catch {
    return false;
  }
}

function formatAmount(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amountMinor / 100);
  } catch {
    return `${amountMinor} ${currency}`;
  }
}

export function ApplicationReviewWorkspace({ applications }: { applications: ApplicationItem[] }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<Record<string, ReviewDocument[]>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDocuments = async (applicationId: string) => {
    setBusyId(applicationId);
    setMessage(null);
    try {
      const response = await fetch(`/api/operations/membership/applications/${applicationId}/documents`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== "object" || !Array.isArray((body as { documents?: unknown }).documents)) {
        setMessage(messageFrom(body, "Protected documents are unavailable."));
        return;
      }
      const nextDocuments: ReviewDocument[] = (body as { documents: unknown[] }).documents.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const itemRecord = item as Record<string, unknown>;
        if (
          typeof itemRecord.documentId !== "string" ||
          (itemRecord.kind !== "profile_photo" && itemRecord.kind !== "identity_document") ||
          (itemRecord.status !== "pending" && itemRecord.status !== "verified")
        ) return [];
        return [{
          documentId: itemRecord.documentId,
          kind: itemRecord.kind as ReviewDocument["kind"],
          status: itemRecord.status as ReviewDocument["status"],
        }];
      });
      setDocuments((current) => ({ ...current, [applicationId]: nextDocuments }));
    } catch {
      setMessage("Protected documents are unavailable.");
    } finally {
      setBusyId(null);
    }
  };

  const viewDocument = async (applicationId: string, documentId: string) => {
    setBusyId(documentId);
    setMessage(null);
    try {
      const response = await fetch(`/api/operations/membership/applications/${applicationId}/documents/${documentId}`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      const signedUrl = body && typeof body === "object" && (body as { review?: { signedUrl?: unknown } }).review?.signedUrl;
      if (!response.ok || !openSignedUrl(signedUrl)) {
        setMessage(messageFrom(body, "A secure document link could not be opened."));
      }
    } catch {
      setMessage("A secure document link could not be opened.");
    } finally {
      setBusyId(null);
    }
  };

  const review = async (applicationId: string, decision: Decision) => {
    setBusyId(applicationId);
    setMessage(null);
    try {
      const response = await fetch("/api/operations/membership/applications/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId, decision, notes: notes[applicationId]?.trim() || undefined }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(messageFrom(body, "The protected application review could not be completed."));
        return;
      }
      setMessage(`Application review recorded as ${label(decision)}. Refresh the page to view the current queue.`);
    } catch {
      setMessage("The protected application review could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="application-review-workspace-title">
      <div><p className="eyebrow">Authorised membership review</p><h2 className="text-xl font-extrabold text-white" id="application-review-workspace-title">Reference-only application queue</h2><p className="mt-2 text-sm leading-6 text-[#aebcb0]">Only authenticated, scoped reviewers can obtain a short-lived document link or submit a state transition. No applicant identity details are rendered here.</p></div>
      {applications.length === 0 ? <p className="rounded-xl border border-white/[0.08] p-4 text-sm text-[#aebcb0]">No reviewable applications are visible in your current scope.</p> : applications.map((application) => <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4" key={application.applicationId}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono font-bold text-white">{application.referenceCode}</p><p className="mt-1 text-xs text-[#aebcb0]">{label(application.status)}</p></div><button className="button button--secondary" disabled={busyId === application.applicationId} onClick={() => void loadDocuments(application.applicationId)} type="button">{busyId === application.applicationId ? "Loading…" : "Review documents"}</button></div>{documents[application.applicationId]?.length ? <div className="mt-4 flex flex-wrap gap-2">{documents[application.applicationId].map((document) => <button className="button button--ghost" disabled={busyId === document.documentId} key={document.documentId} onClick={() => void viewDocument(application.applicationId, document.documentId)} type="button">Open {label(document.kind)}</button>)}</div> : null}<label className="mt-4 block text-sm font-semibold text-[#dbe5dd]" htmlFor={`application-note-${application.applicationId}`}>Reviewer note (required for correction or rejection)<textarea className="mt-2 w-full" id={`application-note-${application.applicationId}`} maxLength={2000} onChange={(event) => setNotes((current) => ({ ...current, [application.applicationId]: event.target.value }))} rows={3} value={notes[application.applicationId] ?? ""} /></label><div className="mt-3 flex flex-wrap gap-2"><button className="button button--secondary" disabled={busyId === application.applicationId} onClick={() => void review(application.applicationId, "under_review")} type="button">Start review</button><button className="button button--secondary" disabled={busyId === application.applicationId} onClick={() => void review(application.applicationId, "requires_correction")} type="button">Request correction</button><button className="button button--primary" disabled={busyId === application.applicationId} onClick={() => void review(application.applicationId, "approved")} type="button">Approve application</button><button className="button button--ghost" disabled={busyId === application.applicationId} onClick={() => void review(application.applicationId, "rejected")} type="button">Reject</button></div></article>)}
      {message ? <p className="field-error" role="status">{message}</p> : null}
    </section>
  );
}

export function PaymentReviewWorkspace() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadQueue = async () => {
    setBusyId("queue");
    try {
      const response = await fetch("/api/operations/payments", { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok || !body || typeof body !== "object" || !Array.isArray((body as { payments?: unknown }).payments)) {
        setMessage(messageFrom(body, "The protected payment queue is unavailable."));
        return;
      }
      const values = (body as { payments: unknown[] }).payments.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        if (typeof row.paymentId !== "string" || typeof row.paymentReference !== "string" || typeof row.applicationReference !== "string" || typeof row.amountMinor !== "number" || typeof row.currency !== "string" || typeof row.status !== "string") return [];
        return [{ paymentId: row.paymentId, paymentReference: row.paymentReference, applicationReference: row.applicationReference, amountMinor: row.amountMinor, currency: row.currency, status: row.status, receiptReceived: row.receiptReceived === true, submittedAt: typeof row.submittedAt === "string" ? row.submittedAt : null }];
      });
      setPayments(values);
      setMessage(null);
    } catch {
      setMessage("The protected payment queue is unavailable.");
    } finally {
      setBusyId(null);
    }
  };

  const viewReceipt = async (paymentId: string) => {
    setBusyId(paymentId);
    try {
      const response = await fetch(`/api/operations/payments/${paymentId}/receipt`, { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      const signedUrl = body && typeof body === "object" && (body as { review?: { signedUrl?: unknown } }).review?.signedUrl;
      if (!response.ok || !openSignedUrl(signedUrl)) setMessage(messageFrom(body, "A secure receipt link could not be opened."));
    } catch {
      setMessage("A secure receipt link could not be opened.");
    } finally {
      setBusyId(null);
    }
  };

  const review = async (paymentId: string, decision: PaymentDecision) => {
    setBusyId(paymentId);
    try {
      const response = await fetch("/api/operations/payments/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentId, decision, notes: notes[paymentId]?.trim() || undefined }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(messageFrom(body, "The protected payment review could not be completed."));
        return;
      }
      await loadQueue();
      setMessage(`Payment review recorded as ${label(decision)}.`);
    } catch {
      setMessage("The protected payment review could not be completed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="payment-review-workspace-title">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Authorised finance review</p><h2 className="text-xl font-extrabold text-white" id="payment-review-workspace-title">Minimal payment queue</h2><p className="mt-2 text-sm leading-6 text-[#aebcb0]">Receipt metadata and storage paths remain server-only. Opening an evidence link is audited and expires after one minute.</p></div><button className="button button--secondary" disabled={busyId === "queue"} onClick={() => void loadQueue()} type="button">{busyId === "queue" ? "Loading…" : "Load payment queue"}</button></div>
      {payments.map((payment) => <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4" key={payment.paymentId}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono font-bold text-white">{payment.applicationReference}</p><p className="mt-1 text-xs text-[#aebcb0]">{payment.paymentReference} · {formatAmount(payment.amountMinor, payment.currency)}</p></div><button className="button button--secondary" disabled={busyId === payment.paymentId || !payment.receiptReceived} onClick={() => void viewReceipt(payment.paymentId)} type="button">View receipt</button></div><label className="mt-4 block text-sm font-semibold text-[#dbe5dd]" htmlFor={`payment-note-${payment.paymentId}`}>Finance note (required for rejection or replacement)<textarea className="mt-2 w-full" id={`payment-note-${payment.paymentId}`} maxLength={2000} onChange={(event) => setNotes((current) => ({ ...current, [payment.paymentId]: event.target.value }))} rows={3} value={notes[payment.paymentId] ?? ""} /></label><div className="mt-3 flex flex-wrap gap-2"><button className="button button--primary" disabled={busyId === payment.paymentId} onClick={() => void review(payment.paymentId, "approved")} type="button">Approve payment</button><button className="button button--secondary" disabled={busyId === payment.paymentId} onClick={() => void review(payment.paymentId, "needs_resubmission")} type="button">Request replacement</button><button className="button button--ghost" disabled={busyId === payment.paymentId} onClick={() => void review(payment.paymentId, "rejected")} type="button">Reject payment</button></div></article>)}
      {payments.length === 0 && busyId !== "queue" ? <p className="rounded-xl border border-white/[0.08] p-4 text-sm text-[#aebcb0]">Load the scoped queue to review synthetic payment evidence.</p> : null}
      {message ? <p className="field-error" role="status">{message}</p> : null}
    </section>
  );
}
