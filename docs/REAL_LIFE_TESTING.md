# Real-life testing protocol

## Purpose

This protocol governs a controlled, non-production trial of the Super Eagles Supporters Club web app. It is not permission to collect real member information, process real payments, or turn on production features. Every tester uses a synthetic identity, fictional content, and disposable documents.

## Current validation boundary

The current repository is not yet evidenced as a live-ready environment:

- Deployment credentials are not configured.
- The Docker daemon is unavailable, so the local Supabase stack has not been started.
- Local migrations, seed/reset execution, live Auth checks, private Storage checks, and cross-identity RLS tests have not been completed.
- Static checks and browser smoke tests can validate code behavior, but they cannot prove a working Supabase, email, payment, CAPTCHA, or production deployment.

These conditions are blockers for a protected-workflow test. Resolve them in an isolated staging environment; do not compensate by weakening feature gates or using production credentials.

## Environment rules

1. Use a dedicated development or staging Supabase project, separate from production.
2. Use a staging hostname and configure only that hostname in Supabase Auth redirect URLs, Turnstile, and email provider allow-lists.
3. Keep `SESC_PREVIEW_SAFE_MODE=true` until migration, RLS, storage, abuse-prevention, and workflow validation evidence has been reviewed.
4. Place server-only values in the deployment secret manager. Never add `.env.local`, service-role keys, provider keys, test passwords, or screenshots containing them to Git.
5. Use non-personal email aliases controlled by the test team and synthetic Nigerian locations, documents, payment references, and contact messages.
6. Do not send email outside a provider sandbox/allow-list. Do not initiate a real payment or upload a real identity document or receipt.
7. Record the application revision, environment name, test role, timestamp, expected outcome, actual outcome, and redacted evidence for each case.

## Required test identities

| Identity | Purpose | Must be denied |
| --- | --- | --- |
| Public visitor | Public routes, contact/newsletter abuse controls, legal pages, accessibility | Protected portals, private APIs, other users' information |
| Unauthenticated user | Login/logout redirects and blocked protected operations | Every member, executive, finance, and admin record |
| Applicant A | Own profile, application, status, and permitted upload lifecycle | Applicant B's profile, documents, payments, and membership |
| Applicant B | Cross-user isolation test | Applicant A's data and every privileged queue |
| Member | Active member portal and safe membership-card view when enabled | Administrative functions and other members' private data |
| Chapter officer A | Chapter-scoped review only | Other chapters and national-only authority |
| Finance officer A | Minimal payment queue and authorised receipt review | Identity-document store, unrelated chapters, self-approval |
| National officer | Explicit national permissions only | Any action not granted by scope |
| Administrator | Role/content/workflow controls explicitly assigned | Self-escalation, unscoped finance decisions, raw secrets |
| Auditor | Read-only authorised audit data | Any mutation or private object not explicitly permitted |

Create these identities only after the Supabase Auth configuration is working. Do not create a shared administrator account; named synthetic roles make audit results meaningful.

## Readiness sequence

### 1. Establish the disposable backend

After Docker is available, run from the repository root:

```powershell
docker version
supabase start
supabase db reset
node scripts/verify-supabase-schema.mjs
npm run supabase:seed:local
npm run test:rls
supabase status
```

`supabase db reset` recreates the local database. It is permitted only for the disposable local stack, never a remote project. Record that the Docker server was reachable and that the migration reset completed before enabling any related `SESC_*_READY` variable.

### 2. Run code-quality checks

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Browser tests must use a local or explicitly approved staging URL. Never point a test that can create users, send mail, upload files, or mutate data at production.

### 3. Prove availability controls

For every protected feature, first verify it fails closed with default configuration. Then, in staging, enable only the smallest set of gates justified by completed evidence. Check that the public health/readiness response reports availability without leaking values, URLs, identifiers, or secrets.

## Test scenarios

### Public routes and input abuse

- Navigate every primary public route on mobile, tablet, and desktop widths; verify navigation, skip links, headings, error states, and legal routes.
- Submit invalid contact, newsletter, and membership inputs. Confirm accessible validation errors and no sensitive server detail.
- Submit malformed, oversized, repeated, and cross-origin-like requests only in staging. Confirm rate limits, CAPTCHA checks where configured, safe errors, and no duplicate records.
- Confirm public content never exposes private applicant, payment, membership, or administrative data.

### Authentication and sessions

- Register and verify a synthetic account only after the approved Auth email and redirect configuration is active.
- Test login, logout, callback validation, password reset, expired/invalid links, duplicate signup behavior, and session refresh.
- Verify unauthenticated requests redirect or return an appropriate denial for `/member`, `/executive`, `/admin`, and every protected API.
- Verify account state and portal feature gates are checked on the server; a client-side route change must not grant access.

### Membership and private uploads

- Applicant A can create, save, submit, and correct only their own permitted record.
- Applicant B receives an explicit denial when attempting Applicant A's URL, object path, API identifier, upload intent, or signed read link.
- Test allowed and denied file MIME types, extensions, the four-mebibyte limit, unsafe names, missing files, expired upload intents, replacement flows, and object ownership.
- Confirm no browser action can self-approve an application, self-assign a role, or bypass required status transitions.

### Payment verification

- Use only a fictional bank reference and synthetic receipt in the isolated environment.
- Verify that a receipt submission results in pending review, not payment approval or membership activation.
- Check that the chapter-scoped finance officer sees only the minimal approved queue and cannot access identity documents or unrelated chapters.
- Verify correction, rejection, approval, supersession, audit logging, and the requirement for both application and payment approval before activation.
- Verify that a payment can activate only the exact original plan, chapter, amount, and currency snapshot; a correction cannot silently reuse it for another membership selection.
- Repeat all denial cases with Applicant B, an unauthenticated user, and a finance officer from another chapter.

### Portals, content, and audit

- Verify member, executive, and administrator pages return data only for the authenticated, authorised identity and only when their feature gate is enabled.
- Verify direct URL access, forged client state, and stale sessions do not bypass role or chapter scope.
- Exercise authorised content publish/unpublish/edit actions with synthetic content only. Confirm unauthorised mutations fail and history/audit events are present where implemented.
- Verify an auditor is read-only and that audit entries omit document contents, keys, tokens, passwords, and full sensitive payloads.

### Email, notification, and consent

- Use allow-listed synthetic mailboxes only.
- Check sender identity, generic subject, HTTPS destinations, plain-text fallback, provider failure behavior, and no duplicate send on retry.
- Confirm newsletter confirmation and unsubscribe are separate from transactional notices and preserve consent history.

### Accessibility and responsive behavior

For each changed route, use keyboard-only navigation and a screen reader where available. Check visible focus, landmark/heading order, labels, error announcements, dialogs, Escape behavior, reduced motion, 200% zoom/reflow, empty/loading/error states, and these viewports:

- 390 x 844
- 768 x 1024
- 1024 x 768
- 1440 x 900

## Evidence and defect handling

Use a restricted test record with a redacted test ID—not a name or email—for each case. Store screenshots, logs, and provider evidence in an access-controlled location. Do not include secrets, cookies, private object URLs, source documents, payment references, account addresses, or real personal information.

| Severity | Definition | Release response |
| --- | --- | --- |
| Critical | Cross-user data exposure, privilege bypass, secret leak, unsafe payment/auth action | Stop testing of the affected feature, disable its gate, investigate, and retest after a fix. |
| High | Data-integrity failure, authorization denial missing, destructive workflow error, inaccessible critical journey | Do not release the affected feature. |
| Medium | Material workflow defect with a safe workaround | Resolve or obtain explicit owner acceptance before release. |
| Low | Non-blocking presentation or copy issue | Track with an owner and target date. |

## Exit criteria

A real-life test phase is complete only when each applicable positive and negative case passes against a non-production environment, live migration/RLS/storage evidence is available, critical and high defects are resolved, email/payment integrations remain restricted to their approved scope, accessibility checks are recorded, and SESC has approved the operating owners. Production stays out of scope until [`docs/RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) is complete.
