# Production release checklist

## Release rule

A checkbox below is evidence, not an intention. Do not mark an item complete based on source inspection, a mock, or a successful static build when the item requires a running integration. Production deployment and feature enablement require the authorised SESC owner to review the completed record.

## Current blockers

The following are currently not evidenced and must remain unchecked:

- [ ] A reachable Docker daemon and a completed local Supabase migration/reset run.
- [ ] Local or staging live Auth, private Storage, cross-identity RLS, and seeded-role validation.
- [ ] Deployment credentials configured in an approved secret manager.
- [ ] Approved SESC sender/domain, contact recipients, payment instructions, production domain, legal copy, and named operating owners.
- [ ] Staging validation of email, CAPTCHA/rate limiting, membership, payment, and privileged workflows.
- [ ] Explicit authority to transmit lockfile-derived dependency metadata to the npm audit service for an online audit, if that audit is required.

Until these conditions are resolved, retain the safe defaults in [`docs/environment.example`](environment.example) and do not enable protected features.

## 1. Change-control record

- [ ] Release has an approved owner, scope, revision/commit identifier, target environment, start window, rollback owner, and communication plan.
- [ ] The change is reviewed through the open pull request and has not been merged prematurely.
- [ ] A privacy/security review has considered the data touched by the release.
- [ ] Content, operational policy, and support ownership are approved by SESC; unknown facts have not been invented.
- [ ] There is a tested rollback decision for every migration and feature flag change.

## 2. Repository hygiene

- [ ] `git status --short` shows only intentional release changes.
- [ ] No committed `.env*` file contains a value, and no local environment file is staged.
- [ ] No real personal information, payment credentials, service-role keys, access tokens, private documents, `node_modules`, build output, browser reports, or confidential attachments are committed.
- [ ] The repository's secret/hygiene CI job passes for the release revision.
- [ ] Dependency review is recorded. If an online audit is authorised, run it only with the approved npm destination and retain redacted results:

```powershell
npm audit --package-lock-only --json
```

- [ ] Vulnerabilities, dependency exceptions, and remediation decisions have a named owner and due date.

## 3. Code and browser validation

Run from the repository root on the exact candidate revision:

```powershell
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

- [ ] All commands above pass, with the command output/version and revision recorded.
- [ ] Unit coverage includes new validation, state transition, permission, and fail-closed paths.
- [ ] Browser coverage includes public routes and any changed user journey.
- [ ] No generated `.next`, `playwright-report`, `test-results`, coverage output, or dependency directory is committed.
- [ ] Any test skipped because an external dependency was unavailable is explicitly listed and resolved before that dependency's feature is enabled.

## 4. Database, Auth, and storage

- [ ] Docker engine is reachable in a disposable local environment.
- [ ] The full migration chain has been run successfully on local development and staging.
- [ ] Static schema verification has passed:

```powershell
node scripts/verify-supabase-schema.mjs
```

- [ ] `supabase db reset` has been completed only against a disposable local stack; it was never pointed to production.
- [ ] Staging migration history, backup, rollback procedure, and maintenance window are reviewed.
- [ ] Each required private bucket exists, is private, and has tested upload/download/replacement/signed-URL controls.
- [ ] Supabase Auth redirect URLs, email settings, session behavior, and account lifecycle are validated on the target domain.
- [ ] Cross-identity RLS cases pass for Applicant A, Applicant B, unauthenticated user, chapter officer, finance officer, national officer, administrator, and auditor.
- [ ] No browser role can write privileged tables, self-assign authority, approve itself, or access another user's private object.

## 5. Environment and feature gates

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` identify the intended environment.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL`, if required, exist only in server-side secret storage.
- [ ] `SESC_DATABASE_MIGRATIONS_READY`, `SESC_ROW_LEVEL_SECURITY_READY`, `SESC_PRIVATE_STORAGE_READY`, `SESC_RATE_LIMITING_READY`, `SESC_CONTACT_RETENTION_READY`, and `SESC_NEWSLETTER_ABUSE_PROTECTION_READY` are `true` only after their evidence is accepted.
- [ ] `SESC_PREVIEW_SAFE_MODE=false` is approved for the exact target environment; preview remains safe.
- [ ] `SESC_AUTHENTICATION_ENABLED`, `SESC_MEMBERSHIP_APPLICATIONS_ENABLED`, `SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED`, `SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED`, `SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED`, `SESC_EMAIL_DELIVERY_ENABLED`, `SESC_MEMBER_PORTAL_ENABLED`, `SESC_EXECUTIVE_PORTAL_ENABLED`, and `SESC_ADMIN_PORTAL_ENABLED` are individually justified.
- [ ] The health/readiness endpoint shows only availability state and does not reveal secrets, URLs, identifiers, or operational detail.
- [ ] Disabled gates return safe unavailable responses and cannot be bypassed through client-side state, query values, or direct API calls.

## 6. Public, member, executive, and administrator journeys

- [ ] All public routes, navigation, legal pages, search/filter states, error pages, and empty states are reviewed on the target domain.
- [ ] Contact and newsletter forms reject malformed/repeated/abusive input safely and do not expose internal errors.
- [ ] Authentication flows include sign-up, verification, login, logout, password reset, callback failure, and session refresh.
- [ ] Membership application lifecycle enforces authorised statuses, corrections, and applicant isolation.
- [ ] Portal pages and APIs enforce authentication, role, scope, chapter, and feature gate on the server.
- [ ] Content changes use authorised workflow/audit controls where implemented; public copy is accurate and owner-approved.
- [ ] TOPSBORG Technologies Limited partnership placements are reviewed for placement, links, disclosure, accessibility, and approved wording.

## 7. Payments, email, and abuse prevention

- [ ] Real bank details, real receipts, and production payment credentials are absent from the repository and test environments.
- [ ] Manual payment verification has a scoped finance queue, private receipts, immutable/superseded decisions, audit trail, and separate membership activation.
- [ ] Any Paystack or other provider integration has separate business/security approval, signature verification, replay protection, idempotency, reconciliation, refund/dispute handling, and test-mode proof.
- [ ] `BREVO_API_KEY`, sender values, and recipients are set only in approved server-side configuration.
- [ ] Sender domain/identity, SPF/DKIM/DMARC, support ownership, consent, unsubscribe, bounces, provider failures, and idempotency are tested in staging.
- [ ] `TURNSTILE_SECRET_KEY` is server-only; `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is correctly scoped to the target hostname.
- [ ] Rate limits, CAPTCHA verification, origin/CSRF-aware protections, safe errors, and duplicate-submission controls pass staged abuse tests.

## 8. Accessibility, privacy, and operations

- [ ] Keyboard navigation, visible focus, labels, error announcements, landmarks, dialogs, reduced motion, zoom/reflow, and screen-reader behavior are reviewed.
- [ ] Responsive checks pass at 390 x 844, 768 x 1024, 1024 x 768, and 1440 x 900.
- [ ] Production monitoring, error reporting, alert ownership, log redaction, and retention are approved.
- [ ] Logs, analytics, email records, audits, and backups exclude secrets, passwords, raw documents, private object URLs, payment references, and unnecessary personal data.
- [ ] Support, security incident, provider outage, data-correction, retention, and credential-rotation procedures have named owners.

## 9. Deployment and rollback

- [ ] A staging rehearsal uses the same deployment method and environment shape as production.
- [ ] Production backup/restore evidence is available before data-affecting migrations.
- [ ] Migrations are applied in the reviewed order and validated before any dependent feature flag is enabled.
- [ ] Smoke checks cover the home page, health/readiness state, authenticated safe route, and intentionally disabled path after deployment.
- [ ] The rollback plan identifies which flags can be disabled immediately and how data migrations will be handled without destructive shortcuts.
- [ ] The release record captures actual time, revision, deployer, validation evidence, open risks, owner approval, and rollback outcome.

## Approval

Production release is authorised only when the responsible SESC product/operations owner, security owner, and technical release owner confirm that every applicable item is complete. If any critical gate lacks evidence, do not deploy that capability; leave it disabled and record the next review date.
