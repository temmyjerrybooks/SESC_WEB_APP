# Row-level security policies

## Canonical security model

All private public-schema tables have RLS enabled. The canonical scoped-role table is access_scopes; the canonical audit table is audit_log. The migrations add membership plans, application steps, private documents, renewals, receipts, verification history, newsletter subscribers, notification preferences, security events, and hashed role invitations.

The browser receives only a Supabase anonymous key. The service-role key bypasses RLS and is server-only; it is not an authorisation mechanism. A trusted operation must first authenticate a user, check a permission/scope, validate an allow-listed input, perform an idempotent mutation, and write an audit/security event.

## Current pre-production posture

Browser table writes and raw private Storage access are deliberately denied. This is not an incomplete policy to be relaxed for a demo; it is the release gate until reviewed server/RPC workflow operations exist.

| Resource | Browser read | Browser write |
| --- | --- | --- |
| Profiles | Self or authorised scoped reader | Denied while pre-production lock is active |
| Membership applications and steps | Applicant or authorised application reviewer | Denied |
| Membership plans | Active public plans only | Denied |
| Memberships | Self or authorised scoped reader | Denied |
| Payments | Payer only | Denied |
| Finance queue | Minimal authorised RPC projection | No raw payment write |
| Documents and receipts | No raw object/browser metadata read | Denied |
| Newsletter subscribers | No read | Denied |
| Notifications | Recipient read; read-state only through authenticated RPC | No direct table write |
| Roles, scopes, permissions, invitations | No unscoped browser mutation | Denied |
| Audit/security events | Authorised audit scope only | Denied |

## Finance data minimisation

Finance permission no longer grants full membership application access. The finance_payment_queue RPC returns only payment/application references, chapter, amount, currency, method, status, receipt presence, verification decision, and timestamps. It deliberately excludes applicant identity, address, date of birth, emergency contact, identity-document/photo paths, receipt paths, and bank/provider references.

## Storage

member-private, payment-receipts, and membership-documents are private. Metadata requires UUID-randomised paths, approved MIME/extension combinations, checksums, and a four-megabyte server-proxied upload limit. Signed read URLs must be generated only after a server-side permission check, must expire quickly, and must not reveal objects from an unrelated application, chapter, or user.

## Required live verification

Static verification is available with node scripts/verify-supabase-schema.mjs. It proves policy presence, not runtime behavior. Before setting RLS readiness true, use separate disposable accounts to prove:

1. An applicant cannot read another applicant's profile, application, payment, receipt, membership, notification, or private object.
2. A Chapter A officer cannot read or mutate Chapter B private resources without a national scope.
3. A finance officer can read only the minimal queue and an authorised receipt, not identity-document metadata.
4. A member cannot approve an application, verify a payment, activate membership, or assign a role.
5. A suspended account cannot use protected server routes.
6. A super-administrator role cannot be self-assigned from browser input and its assignment creates a security event.
7. An invitation token cannot be read from the database, reused after acceptance, or applied to another authenticated recipient.

Do not state that RLS is validated until these live cross-identity tests have actually run.
