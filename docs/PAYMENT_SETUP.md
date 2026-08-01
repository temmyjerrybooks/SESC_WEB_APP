# Payment setup and verification

## Current readiness

SESC has a documented manual bank-transfer verification model plus guarded server/RPC foundations for receipt registration, finance decisions, and eligibility-based membership activation. Public payment submission, private receipt upload, finance decisions, card activation, Paystack charging, and webhook processing remain disabled until their storage controls and staging evidence are complete.

No bank account details, payment-provider credentials, receipts, payer data, or live transaction references belong in this repository. The platform must never infer payment approval or membership activation from a browser field, uploaded file, or payment reference alone.

## Approved payment paths

| Path | Current status | Conditions before use |
| --- | --- | --- |
| Manual bank transfer | Guarded server/RPC foundation; disabled | Approved off-repository bank instructions, private receipt storage, scoped finance review, audit trail, and staging validation. |
| Paystack or another provider | Interface/configuration placeholder only | Separate approved implementation, provider onboarding, webhook validation, replay protection, dispute/refund process, and security review. |

The manual process is the only contemplated initial route. A payment-provider key must not be used as a shortcut around manual verification, finance authority, or membership activation controls.

## Required environment controls

| Setting | Use | Required state before a manual workflow can be enabled |
| --- | --- | --- |
| `SESC_PREVIEW_SAFE_MODE` | Global fail-closed control | `false` only in a reviewed staging or production environment. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | Authenticated application context | Point to the isolated reviewed environment. |
| `SUPABASE_SERVICE_ROLE_KEY` | Trusted server operations | Stored only in deployment secrets after server-authorisation review. |
| `SUPABASE_PAYMENT_RECEIPTS_BUCKET` | Private receipt bucket | Exists, remains private, and has tested signed-access rules. |
| `SESC_DATABASE_MIGRATIONS_READY`, `SESC_ROW_LEVEL_SECURITY_READY`, `SESC_PRIVATE_STORAGE_READY` | Data and storage evidence gates | `true` only after real migration, cross-identity RLS, and private-storage evidence. |
| `SESC_AUTHENTICATION_ENABLED`, `SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED` | Prerequisite feature gates | `true` only after their own approval and staging validation. |
| `SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED` | Manual payment enablement | `true` only after every prerequisite in this guide is approved. |
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Future provider adapter | Blank unless a separate provider release has been implemented and approved. |

All readiness values must be literal `true` or `false`. They are deployment controls; they cannot be supplied by a user, URL, cookie, or browser storage.

## Manual bank-transfer operating design

1. An authorised SESC owner maintains current bank instructions outside the codebase and approves every revision.
2. A signed-in applicant views only the instructions and status intended for their own application.
3. The applicant submits a payment reference and a receipt only through a trusted, validated server workflow. The receipt is stored privately under a non-guessable path.
4. The system records a pending state; it does not mark a payment paid, verified, or membership active.
5. A finance officer with the specific scoped permission reviews a minimal queue: application reference, chapter, amount, currency, method, receipt presence, and status. The queue excludes identity documents and unrelated profile data.
6. Receipt access is a distinct, short-lived, server-authorised signed-URL action. Seeing a receipt does not grant access to identity documents.
7. A finance decision is immutable after supersession and is written to the audit log with a controlled reason. Rejecting or requesting correction must preserve history.
8. Membership activation is a separate authorised decision that requires both application approval and payment approval.

Keep application review, finance verification, and membership activation separate where organisation size permits. The same person must not be able to manufacture an applicant record, approve their own payment, and activate their own membership.

## Private receipt requirements

Before receipt upload is enabled, define and test:

- Accepted MIME types and extensions, maximum byte size, checksum/byte inspection, and rejection messages.
- Random private object paths that never include a full name, email address, payment reference, or predictable sequence.
- Ownership checks for upload, replacement, download, and expiry.
- Versioning and a single-current-receipt lifecycle.
- Malware-scanning/quarantine process where the approved infrastructure provides it.
- Retention, deletion, correction, and incident procedures approved by SESC.

Never include a raw receipt URL, bank reference, or document content in an email subject, public page, client-side log, browser error, or pull request.

## Staging test protocol

Use an isolated non-production Supabase project after migrations and RLS have actually been applied. Use only synthetic data and the test roles below:

| Test identity | Required proof |
| --- | --- |
| Applicant A | Can create and view only their own application and receipt state. |
| Applicant B | Cannot read, alter, replace, or download Applicant A's data. |
| Unauthorised user | Cannot call protected receipt, payment, or finance operations. |
| Finance officer for chapter A | Can review only the authorised chapter's minimal finance queue and permitted receipts. |
| Finance officer for chapter B | Is denied access to chapter A records. |
| Membership decision-maker | Cannot activate an unapproved/unpaid application and cannot self-assign authority. |
| Auditor | Can view only approved audit data and cannot mutate payment or membership state. |

For every test, retain only redacted evidence of identity role, action, expected result, actual result, timestamp, build revision, and reviewer. Do not save login cookies, source documents, receipts, payment references, personal addresses, or credentials.

## Future provider integration

A Paystack or other gateway implementation requires a separate change and approval. Before any key is added to deployment secrets:

1. Obtain business approval for fees, settlement account, refunds, disputes, data processing, support ownership, and reconciliation.
2. Implement a server-only initiation flow that authorises the user and records an idempotent pending transaction.
3. Implement a server-only webhook endpoint with provider-signature verification, timestamp/replay protection, strict event schema validation, and an audit trail.
4. Make the webhook decision authoritative; do not trust success pages, query parameters, or client callbacks.
5. Reconcile provider events with the internal payment record and test duplicate, delayed, out-of-order, failed, refunded, and disputed events.
6. Use provider test mode and synthetic cards/accounts first. Do not use production keys in local development or automated tests.

## Release evidence

Do not set `SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED=true` until the migration chain, private storage, cross-user RLS tests, finance scope tests, decision audit trail, error handling, accessibility checks, and a staging rehearsal all pass and an authorised SESC owner approves the operating procedure. Keep `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` blank until a distinct provider release reaches the same standard.
