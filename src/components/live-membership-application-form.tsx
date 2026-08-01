"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { maximumPrivateUploadBytes } from "@/lib/storage/private-upload";

type ChapterOption = {
  id: string;
  name: string;
  city: string | null;
  stateOrRegion: string | null;
  countryCode: string;
};

type MembershipPlanOption = {
  id: string;
  name: string;
  description: string | null;
  amountMinor: number;
  currency: string;
  termMonths: number;
};

type MembershipOptions = {
  chapters: ChapterOption[];
  plans: MembershipPlanOption[];
};

type Application = {
  applicationId: string;
  referenceCode: string;
  status: string;
  reviewNotes?: string;
};

type ApplicationDraft = {
  chapterId: string;
  membershipPlanId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  city: string;
  countryCode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  marketingConsent: boolean;
};

type Payment = {
  paymentId: string;
  status: string;
  reviewNotes?: string;
};

type OwnedApplication = {
  application: Application | null;
  draft: ApplicationDraft | null;
  payment: Payment | null;
  documents: Partial<Record<DocumentKind, true>>;
};

type DocumentKind = "profile_photo" | "identity_document";

type PreparedUpload = {
  intentId: string;
};

type PreparedPaymentReceiptUpload = {
  intentId: string;
};

const maximumFileBytes = maximumPrivateUploadBytes;
const acceptedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function messageFrom(body: unknown, fallback: string) {
  if (body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string") {
    return (body as { message: string }).message;
  }
  return fallback;
}

function applicationFrom(body: unknown): Application | null {
  if (!body || typeof body !== "object") return null;
  const application = (body as { application?: unknown }).application;
  if (!application || typeof application !== "object") return null;
  const record = application as Record<string, unknown>;
  if (
    typeof record.application_id !== "string" ||
    typeof record.reference_code !== "string" ||
    typeof record.status !== "string"
  ) {
    return null;
  }
  return {
    applicationId: record.application_id,
    referenceCode: record.reference_code,
    status: record.status,
  };
}

function ownedApplicationFrom(body: unknown): OwnedApplication | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.application === null) {
    return { application: null, draft: null, payment: null, documents: {} };
  }
  if (!record.application || typeof record.application !== "object") return null;
  const application = record.application as Record<string, unknown>;
  const required = [
    "applicationId",
    "referenceCode",
    "status",
    "chapterId",
    "membershipPlanId",
    "firstName",
    "lastName",
    "dateOfBirth",
    "phone",
    "address",
    "city",
    "countryCode",
    "emergencyContactName",
    "emergencyContactPhone",
  ];
  if (required.some((key) => typeof application[key] !== "string")) return null;

  const parsedApplication: Application = {
    applicationId: application.applicationId as string,
    referenceCode: application.referenceCode as string,
    status: application.status as string,
    reviewNotes: typeof application.reviewNotes === "string" ? application.reviewNotes : undefined,
  };
  const draft: ApplicationDraft = {
    chapterId: application.chapterId as string,
    membershipPlanId: application.membershipPlanId as string,
    firstName: application.firstName as string,
    lastName: application.lastName as string,
    dateOfBirth: application.dateOfBirth as string,
    phone: application.phone as string,
    address: application.address as string,
    city: application.city as string,
    countryCode: application.countryCode as string,
    emergencyContactName: application.emergencyContactName as string,
    emergencyContactPhone: application.emergencyContactPhone as string,
    marketingConsent: application.marketingConsent === true,
  };
  const paymentRecord = record.payment;
  const payment = paymentRecord && typeof paymentRecord === "object"
    && typeof (paymentRecord as Record<string, unknown>).paymentId === "string"
    && typeof (paymentRecord as Record<string, unknown>).status === "string"
    ? {
        paymentId: (paymentRecord as Record<string, unknown>).paymentId as string,
        status: (paymentRecord as Record<string, unknown>).status as string,
        reviewNotes: typeof (paymentRecord as Record<string, unknown>).reviewNotes === "string"
          ? (paymentRecord as Record<string, unknown>).reviewNotes as string
          : undefined,
      }
    : null;
  const documents = Array.isArray(record.documents)
    ? record.documents.reduce<Partial<Record<DocumentKind, true>>>((current, item) => {
        const kind = item && typeof item === "object" ? (item as Record<string, unknown>).kind : undefined;
        if (kind === "profile_photo" || kind === "identity_document") current[kind] = true;
        return current;
      }, {})
    : {};

  return { application: parsedApplication, draft, payment, documents };
}

async function fetchOwnedApplication(): Promise<OwnedApplication | null> {
  try {
    const response = await fetch("/api/membership/applications", { cache: "no-store" });
    const body: unknown = await response.json().catch(() => null);
    return response.ok ? ownedApplicationFrom(body) : null;
  } catch {
    return null;
  }
}

function optionsFrom(body: unknown): MembershipOptions | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.chapters) || !Array.isArray(record.plans)) return null;

  const chapters = record.chapters.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const chapter = item as Record<string, unknown>;
    if (typeof chapter.id !== "string" || typeof chapter.name !== "string" || typeof chapter.countryCode !== "string") {
      return [];
    }
    return [{
      id: chapter.id,
      name: chapter.name,
      city: typeof chapter.city === "string" ? chapter.city : null,
      stateOrRegion: typeof chapter.stateOrRegion === "string" ? chapter.stateOrRegion : null,
      countryCode: chapter.countryCode,
    }];
  });
  const plans = record.plans.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const plan = item as Record<string, unknown>;
    if (
      typeof plan.id !== "string" ||
      typeof plan.name !== "string" ||
      typeof plan.amountMinor !== "number" ||
      typeof plan.currency !== "string" ||
      typeof plan.termMonths !== "number"
    ) {
      return [];
    }
    return [{
      id: plan.id,
      name: plan.name,
      description: typeof plan.description === "string" ? plan.description : null,
      amountMinor: plan.amountMinor,
      currency: plan.currency,
      termMonths: plan.termMonths,
    }];
  });

  return { chapters, plans };
}

function preparedUploadFrom(body: unknown): PreparedUpload | null {
  if (!body || typeof body !== "object") return null;
  const upload = (body as { upload?: unknown }).upload;
  if (!upload || typeof upload !== "object") return null;
  const record = upload as Record<string, unknown>;
  if (
    typeof record.intentId !== "string"
  ) {
    return null;
  }
  return {
    intentId: record.intentId,
  };
}

function preparedPaymentReceiptUploadFrom(body: unknown): PreparedPaymentReceiptUpload | null {
  if (!body || typeof body !== "object") return null;
  const upload = (body as { upload?: unknown }).upload;
  if (!upload || typeof upload !== "object") return null;
  const record = upload as Record<string, unknown>;
  if (
    typeof record.intentId !== "string"
  ) {
    return null;
  }
  return {
    intentId: record.intentId,
  };
}

function formatPlan(plan: MembershipPlanOption) {
  try {
    const amount = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: plan.currency,
      maximumFractionDigits: 2,
    }).format(plan.amountMinor / 100);
    return `${plan.name} — ${amount} / ${plan.termMonths} month${plan.termMonths === 1 ? "" : "s"}`;
  } catch {
    return `${plan.name} — ${plan.termMonths} month${plan.termMonths === 1 ? "" : "s"}`;
  }
}

function validateFile(kind: DocumentKind, file: File | null) {
  if (!file) return "Choose a file before uploading.";
  if (file.size > maximumFileBytes) return "Files must be 4 MB or smaller.";
  if (!acceptedMimeTypes.has(file.type)) return "Use a JPEG, PNG, WebP, or PDF file.";
  if (kind === "profile_photo" && file.type === "application/pdf") {
    return "Your profile photo must be an image file.";
  }
  return null;
}

export function LiveMembershipApplicationForm({ siteKey }: { siteKey: string }) {
  const [options, setOptions] = useState<MembershipOptions | null>(null);
  const [optionsMessage, setOptionsMessage] = useState<string | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<DocumentKind | "payment_receipt" | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentKind, true>>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [draftDirty, setDraftDirty] = useState(true);
  const onTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  const reloadApplication = useCallback(async () => {
    const current = await fetchOwnedApplication();
    if (!current) return;
    setApplication(current.application);
    setDraft(current.draft);
    setPayment(current.payment);
    setDocuments(current.documents);
    setMarketingConsent(current.draft?.marketingConsent ?? false);
    setDraftDirty(false);
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetch("/api/membership/options", { cache: "no-store" });
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          if (active) setOptionsMessage(messageFrom(body, "Membership application choices are unavailable."));
          return;
        }
        const parsed = optionsFrom(body);
        if (!parsed || parsed.chapters.length === 0 || parsed.plans.length === 0) {
          if (active) setOptionsMessage("Membership application choices are not available yet.");
          return;
        }
        if (active) setOptions(parsed);
      } catch {
        if (active) setOptionsMessage("Membership application choices are unavailable. Please try again later.");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      const current = await fetchOwnedApplication();
      if (!active || !current) return;
      setApplication(current.application);
      setDraft(current.draft);
      setPayment(current.payment);
      setDocuments(current.documents);
      setMarketingConsent(current.draft?.marketingConsent ?? false);
      setDraftDirty(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setMessage(null);
    setSaving(true);

    const nextDraft: ApplicationDraft = {
      chapterId: String(form.get("chapterId") ?? ""),
      membershipPlanId: String(form.get("membershipPlanId") ?? ""),
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      dateOfBirth: String(form.get("dateOfBirth") ?? ""),
      phone: String(form.get("phone") ?? ""),
      address: String(form.get("address") ?? ""),
      city: String(form.get("city") ?? ""),
      countryCode: String(form.get("countryCode") ?? ""),
      emergencyContactName: String(form.get("emergencyContactName") ?? ""),
      emergencyContactPhone: String(form.get("emergencyContactPhone") ?? ""),
      marketingConsent,
    };
    setDraft(nextDraft);

    try {
      const response = await fetch("/api/membership/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "save",
          ...nextDraft,
          marketingConsent,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      const savedApplication = applicationFrom(body);
      if (!response.ok || !savedApplication) {
        setMessage(messageFrom(body, "We could not save the protected draft. Please try again."));
        return;
      }

      if (!application || application.applicationId !== savedApplication.applicationId) {
        setDocuments({});
      }
      setApplication((current) => ({ ...(current ?? {}), ...savedApplication }));
      setDraftDirty(false);
      setMessage(`Protected draft ${savedApplication.referenceCode} has been saved. Upload both required documents to continue.`);
    } catch {
      setMessage("We could not save the protected draft. Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (kind: DocumentKind, file: File | null) => {
    const fileError = validateFile(kind, file);
    if (fileError || !file || !application) {
      setMessage(fileError ?? "Save a protected draft before uploading documents.");
      return;
    }

    setMessage(null);
    setUploading(kind);
    try {
      const endpoint = `/api/membership/applications/${application.applicationId}/documents`;
      const prepareResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phase: "prepare",
          applicationId: application.applicationId,
          kind,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      const prepareBody: unknown = await prepareResponse.json().catch(() => null);
      const upload = preparedUploadFrom(prepareBody);
      if (!prepareResponse.ok || !upload) {
        setMessage(messageFrom(prepareBody, "We could not prepare a protected upload."));
        return;
      }

      const uploadBody = new FormData();
      uploadBody.set("phase", "upload");
      uploadBody.set("applicationId", application.applicationId);
      uploadBody.set("intentId", upload.intentId);
      uploadBody.set("kind", kind);
      uploadBody.set("file", file);
      const completeResponse = await fetch(endpoint, {
        method: "POST",
        body: uploadBody,
      });
      const completeBody: unknown = await completeResponse.json().catch(() => null);
      if (!completeResponse.ok) {
        setMessage(messageFrom(completeBody, "The document could not be verified. Please try again."));
        return;
      }

      setDocuments((current) => ({ ...current, [kind]: true }));
      setMessage(`${kind === "profile_photo" ? "Profile photo" : "Identity document"} has been securely verified for this draft.`);
    } catch {
      setMessage("The document upload could not be completed. Please try again later.");
    } finally {
      setUploading(null);
    }
  };

  const submitApplication = async () => {
    if (!application || draftDirty) {
      setMessage("Save your latest application details before submitting.");
      return;
    }
    if (!documents.profile_photo || !documents.identity_document) {
      setMessage("Upload and verify both required documents before submitting.");
      return;
    }
    if (!turnstileToken) {
      setMessage("Complete the security check before submitting your application.");
      return;
    }

    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/membership/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "submit",
          applicationId: application.applicationId,
          marketingConsent,
          turnstileToken,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      const submittedApplication = applicationFrom(body);
      if (!response.ok || !submittedApplication) {
        setMessage(messageFrom(body, "We could not submit the application. Please try again."));
        return;
      }
      setApplication(submittedApplication);
      await reloadApplication();
      setMessage(`Application ${submittedApplication.referenceCode} was received and is awaiting authorised review. Membership remains inactive until approved.`);
    } catch {
      setMessage("We could not submit the application. Please try again later.");
    } finally {
      setSaving(false);
    }
  };

  const uploadPaymentReceipt = async (file: File | null) => {
    const fileError = validateFile("identity_document", file);
    if (fileError || !file || !payment) {
      setMessage(fileError ?? "A payment receipt is not available for upload yet.");
      return;
    }

    setMessage(null);
    setUploading("payment_receipt");
    try {
      const endpoint = `/api/membership/payments/${payment.paymentId}/receipt`;
      const prepareResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phase: "prepare",
          paymentId: payment.paymentId,
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
        }),
      });
      const prepareBody: unknown = await prepareResponse.json().catch(() => null);
      const upload = preparedPaymentReceiptUploadFrom(prepareBody);
      if (!prepareResponse.ok || !upload) {
        setMessage(messageFrom(prepareBody, "We could not prepare a protected payment-receipt upload."));
        return;
      }

      const uploadBody = new FormData();
      uploadBody.set("phase", "upload");
      uploadBody.set("paymentId", payment.paymentId);
      uploadBody.set("intentId", upload.intentId);
      uploadBody.set("file", file);
      const completeResponse = await fetch(endpoint, {
        method: "POST",
        body: uploadBody,
      });
      const completeBody: unknown = await completeResponse.json().catch(() => null);
      if (!completeResponse.ok) {
        setMessage(messageFrom(completeBody, "The payment receipt could not be verified. Please try again."));
        return;
      }
      setPayment((current) => current ? { ...current, status: "pending_verification", reviewNotes: undefined } : current);
      setMessage("Your payment receipt is queued for authorised verification.");
    } catch {
      setMessage("The payment-receipt upload could not be completed. Please try again later.");
    } finally {
      setUploading(null);
    }
  };

  if (optionsMessage) {
    return (
      <div className="empty-state" role="status">
        <p>{optionsMessage}</p>
        <div className="button-row">
          <Link className="button button--primary" href="/login">Sign in</Link>
          <Link className="button button--secondary" href="/register">Create an account</Link>
        </div>
      </div>
    );
  }

  if (!options) {
    return <div className="empty-state" role="status">Loading protected application choices…</div>;
  }

  const canEditApplication = !application || application.status === "draft" || application.status === "requires_correction";
  const submitted = Boolean(application && !canEditApplication);
  const receiptCanBeUploaded = payment?.status === "pending_receipt" || payment?.status === "needs_resubmission";

  return (
    <div className="form-grid">
      <form className="form-grid full" key={application?.applicationId ?? "new"} onChange={() => setDraftDirty(true)} onSubmit={saveDraft}>
        <div className="field"><label htmlFor="membership-plan">Membership plan</label><select defaultValue={draft?.membershipPlanId ?? ""} disabled={saving || submitted} id="membership-plan" name="membershipPlanId" required><option disabled value="">Choose a plan</option>{options.plans.map((plan) => <option key={plan.id} value={plan.id}>{formatPlan(plan)}</option>)}</select></div>
        <div className="field"><label htmlFor="membership-chapter">Preferred chapter</label><select defaultValue={draft?.chapterId ?? ""} disabled={saving || submitted} id="membership-chapter" name="chapterId" required><option disabled value="">Choose a chapter</option>{options.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{[chapter.name, chapter.city ?? chapter.stateOrRegion, chapter.countryCode].filter(Boolean).join(" — ")}</option>)}</select></div>
        <div className="field"><label htmlFor="membership-first-name">First name</label><input autoComplete="given-name" defaultValue={draft?.firstName ?? ""} disabled={saving || submitted} id="membership-first-name" name="firstName" required /></div>
        <div className="field"><label htmlFor="membership-last-name">Last name</label><input autoComplete="family-name" defaultValue={draft?.lastName ?? ""} disabled={saving || submitted} id="membership-last-name" name="lastName" required /></div>
        <div className="field"><label htmlFor="membership-date-of-birth">Date of birth</label><input defaultValue={draft?.dateOfBirth ?? ""} disabled={saving || submitted} id="membership-date-of-birth" name="dateOfBirth" required type="date" /></div>
        <div className="field"><label htmlFor="membership-phone">Phone number</label><input autoComplete="tel" defaultValue={draft?.phone ?? ""} disabled={saving || submitted} id="membership-phone" name="phone" required type="tel" /></div>
        <div className="field full"><label htmlFor="membership-address">Address</label><input autoComplete="street-address" defaultValue={draft?.address ?? ""} disabled={saving || submitted} id="membership-address" name="address" required /></div>
        <div className="field"><label htmlFor="membership-city">City</label><input autoComplete="address-level2" defaultValue={draft?.city ?? ""} disabled={saving || submitted} id="membership-city" name="city" required /></div>
        <div className="field"><label htmlFor="membership-country">Country code</label><input autoComplete="country" defaultValue={draft?.countryCode ?? "NG"} disabled={saving || submitted} id="membership-country" maxLength={2} name="countryCode" required /></div>
        <div className="field"><label htmlFor="membership-emergency-name">Emergency contact name</label><input defaultValue={draft?.emergencyContactName ?? ""} disabled={saving || submitted} id="membership-emergency-name" name="emergencyContactName" required /></div>
        <div className="field"><label htmlFor="membership-emergency-phone">Emergency contact phone</label><input defaultValue={draft?.emergencyContactPhone ?? ""} disabled={saving || submitted} id="membership-emergency-phone" name="emergencyContactPhone" required type="tel" /></div>
        <label className="consent full"><input checked={marketingConsent} disabled={saving || submitted} name="marketingConsent" onChange={(event) => setMarketingConsent(event.target.checked)} type="checkbox" /><span>I would like to receive optional club news and opportunities. I can change this later.</span></label>
        {!submitted ? <div className="button-row full"><button className="button button--primary" disabled={saving} type="submit">{saving ? "Saving…" : application ? "Save changes" : "Save protected draft"}</button></div> : null}
      </form>

      {application ? <section className="full rounded-xl border border-white/[0.1] bg-white/[0.025] p-4 text-sm leading-6 text-[#c8d4ca]"><strong className="text-white">Application {application.referenceCode}</strong><p className="mt-1">Current status: {application.status.replaceAll("_", " ")}.</p>{application.reviewNotes ? <p className="mt-3 border-l-2 border-[#f5cf4c] pl-3"><strong className="text-[#f5cf4c]">Authorised review note:</strong> {application.reviewNotes}</p> : null}</section> : null}

      {application && canEditApplication ? (
        <section className="form-grid full" aria-labelledby="membership-documents-title">
          <div className="full"><p className="eyebrow">Required private documents</p><h3 id="membership-documents-title">Draft {application.referenceCode}</h3><p>Each file is verified by the server after upload. Images must be JPEG, PNG, or WebP; identity documents may also be PDF. Maximum size: 4 MB.</p></div>
          <DocumentUploadField accept="image/jpeg,image/png,image/webp" complete={Boolean(documents.profile_photo)} disabled={saving || uploading !== null || draftDirty} id="membership-profile-photo" label="Profile photo" onUpload={(file) => void uploadDocument("profile_photo", file)} uploading={uploading === "profile_photo"} />
          <DocumentUploadField accept="image/jpeg,image/png,image/webp,application/pdf" complete={Boolean(documents.identity_document)} disabled={saving || uploading !== null || draftDirty} id="membership-identity-document" label="Identity document" onUpload={(file) => void uploadDocument("identity_document", file)} uploading={uploading === "identity_document"} />
          {draftDirty ? <p className="field-error full" role="status">Save the latest application details before uploading documents or submitting.</p> : null}
          <div className="full"><TurnstileWidget action="sesc_membership_submit" disabled={saving || uploading !== null || draftDirty} onToken={onTurnstileToken} siteKey={siteKey} /></div>
          <div className="button-row full"><button className="button button--primary" disabled={saving || uploading !== null || draftDirty || !documents.profile_photo || !documents.identity_document || !turnstileToken} onClick={() => void submitApplication()} type="button">{saving ? "Submitting…" : "Submit for authorised review"}</button></div>
        </section>
      ) : null}

      {payment ? (
        <section className="form-grid full" aria-labelledby="payment-receipt-title">
          <div className="full"><p className="eyebrow">Manual payment</p><h3 id="payment-receipt-title">Payment status: {payment.status.replaceAll("_", " ")}</h3><p>Upload only a harmless receipt image or PDF for the controlled test. Payment is not approved until an authorised finance officer reviews it.</p>{payment.reviewNotes ? <p className="mt-3 border-l-2 border-[#f5cf4c] pl-3"><strong className="text-[#f5cf4c]">Finance review note:</strong> {payment.reviewNotes}</p> : null}</div>
          {receiptCanBeUploaded ? <DocumentUploadField accept="image/jpeg,image/png,image/webp,application/pdf" complete={false} disabled={saving || uploading !== null} id="membership-payment-receipt" label="Payment receipt" onUpload={(file) => void uploadPaymentReceipt(file)} uploading={uploading === "payment_receipt"} /> : <p className="full text-sm text-[#aebcb0]">{payment.status === "pending_verification" ? "Your receipt is queued for authorised verification." : "No payment receipt upload is currently required."}</p>}
        </section>
      ) : null}

      {message ? <p className="field-error full" role="status">{message}</p> : null}
    </div>
  );
}

function DocumentUploadField({
  accept,
  complete,
  disabled,
  id,
  label,
  onUpload,
  uploading,
}: {
  accept: string;
  complete: boolean;
  disabled: boolean;
  id: string;
  label: string;
  onUpload: (file: File | null) => void;
  uploading: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input accept={accept} disabled={disabled} id={id} onChange={(event) => setFile(event.target.files?.[0] ?? null)} type="file" />
      <div className="button-row"><button className="button button--secondary" disabled={disabled} onClick={() => onUpload(file)} type="button">{uploading ? "Verifying…" : complete ? "Replace verified document" : "Upload and verify"}</button></div>
      {complete ? <p role="status">Securely verified for this draft.</p> : null}
    </div>
  );
}
