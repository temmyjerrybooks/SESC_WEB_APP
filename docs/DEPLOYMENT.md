# Deployment Guide

## Release boundary

The current repository can be deployed as a public development preview, but it is not authorised to process real member identity documents, payment evidence, subscriptions, or operational administration. Trusted server route and database-RPC foundations now exist for authentication, contact, newsletter confirmation, membership drafting/submission, private document registration, reviews, role invitations, and content administration; they remain unavailable until every feature gate prerequisite has been configured and evidenced in non-production.

Do not turn on a public membership campaign until the prerequisites in this guide and [SECURITY.md](../SECURITY.md) are complete.

## Hosting target

The app is a standard Next.js App Router project and can run on a Node-compatible Next.js host. The project brief favours Cloudflare, but this repository does not currently include OpenNext/Cloudflare adapter packages, a `wrangler` configuration, or a deployment workflow. Add and validate an approved adapter in a focused change before selecting Cloudflare as the production runtime.

Until then, use only a hosting target that supports the repository's current Next.js runtime and server route handlers. Do not claim Cloudflare compatibility merely because the app is planned for it.

## Controlled Vercel Preview-as-staging

An ordinary pull-request Preview remains fail-closed. Enabling protected test flows requires a specifically approved, isolated Preview-as-staging deployment with synthetic data only. Keep Vercel's production branch set to `main`; scope test-only secrets and feature flags to `feat/full-platform-implementation` or the designated staging environment.

Before enabling any gate, assign a stable HTTPS Vercel alias and set `NEXT_PUBLIC_SITE_URL` to that exact origin. Use the same origin for Supabase Auth's site URL and explicit redirect URLs, and add only the matching Vercel-account wildcard supported by Supabase. Configure the Turnstile widget for that stable hostname. Do not use a changing PR deployment URL for these controls, because callback, reset, and newsletter-confirmation links must return to the exact reviewed deployment.

### Preview enablement order

1. Keep `SESC_PREVIEW_SAFE_MODE=true` and all `SESC_*_ENABLED` flags false for the ordinary Preview build.
2. Create an isolated hosted Supabase test project, apply the complete migration chain, provision the three private buckets, and prove the synthetic seed/RLS cases. Do not link, seed, or migrate production.
3. Create a stable HTTPS Preview alias, set it identically in `NEXT_PUBLIC_SITE_URL`, Supabase Auth Site URL, and the explicit redirect allow-list, then configure that hostname in Turnstile.
4. Add the Preview-only public Supabase values and server-only service-role value through Vercel's encrypted environment settings. Never add them to source, build logs, or `.env*` files.
5. Verify Vercel's forwarded-client-IP behavior before setting `SESC_TRUSTED_PROXY_HEADERS=true`. Only after the preceding evidence exists may the relevant readiness and feature flags be enabled, one workflow at a time.

For an authentication-only synthetic test, the minimum enabled Preview set is `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_AUTH_ACTIONS_ENABLED=true`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `SESC_PREVIEW_SAFE_MODE=false`, `SESC_DATABASE_MIGRATIONS_READY=true`, `SESC_ROW_LEVEL_SECURITY_READY=true`, `SESC_RATE_LIMITING_READY=true`, `SESC_TRUSTED_PROXY_HEADERS=true`, and `SESC_AUTHENTICATION_ENABLED=true`. Membership also requires verified private storage plus `SESC_PRIVATE_STORAGE_READY=true`, `SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED=true`, `SESC_MEMBERSHIP_APPLICATIONS_ENABLED=true`, and `SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED=true`. Keep email, Brevo, contact, newsletter, Paystack, and other unrelated gates false until separately evidenced with synthetic data.

## Pre-deployment checklist

1. Review the target commit, migrations, configuration changes, and [CHANGELOG.md](../CHANGELOG.md).
2. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`.
3. Verify all public content is approved or visibly labelled as development content. Replace placeholder legal pages, public links, contacts, and social destinations before launch.
4. Choose a canonical HTTPS domain and set `NEXT_PUBLIC_SITE_URL` exactly to that origin, without a trailing path.
5. Configure Supabase Auth site URL and redirect allow-list for every production and trusted preview URL. Keep public sign-up and email delivery disabled (or invite-only) until approved Auth, Turnstile, rate-limit, sender, and account-operation controls exist.
6. Review database migrations in a disposable/staging project first. Confirm backup, ownership, and rollback responsibilities before production `db push`.
7. Provision private `member-private`, `payment-receipts`, and `membership-documents` buckets and test their policies with separate synthetic identities.
8. Run the RLS scenarios in [RLS_POLICIES.md](RLS_POLICIES.md) and document the results.

## Deployment configuration

Set values in the host's encrypted environment configuration; never commit them to the repository.

| Setting | Production requirement |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anonymous key; RLS must be enabled. |
| `NEXT_PUBLIC_AUTH_ACTIONS_ENABLED` | Browser-safe UI approval flag. The server authentication gate, Supabase configuration, applied migrations/RLS, Turnstile, and durable rate limit must also pass. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only requirement for enabled account actions, durable rate limiting, private workflows, and reviewed privileged endpoints. |
| `NEXT_PUBLIC_SITE_URL` | Canonical HTTPS origin; use a stable staging alias for controlled Preview testing. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Required before public forms rely on Turnstile. |
| `BREVO_API_KEY`, `BREVO_SENDER_ADDRESS`, `BREVO_SENDER_NAME` | Required only after the reviewed Brevo API adapter, verified sender identity, recipient ownership, and staging evidence exist. |
| `SESC_RATE_LIMITING_READY`, `SESC_CONTACT_RETENTION_READY`, `SESC_NEWSLETTER_ABUSE_PROTECTION_READY` | Required evidence gates for the related public workflows; do not set true from a browser-controlled value. |
| `SESC_TRUSTED_PROXY_HEADERS` | Set `true` only after the Preview host's forwarded-client-IP headers have been verified. Authentication, contact, newsletter, and membership submissions otherwise fail closed. |
| `SESC_CONTACT_RECIPIENT` | Server-only approved contact destination; never include it in source or browser configuration. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Required only after Sentry instrumentation is added and alert ownership exists. |
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Keep absent/disabled unless the club approves the optional Paystack implementation. |

Other configuration still needed before live operation includes authorised manual bank-transfer instructions, an approved email sender/reply-to identity, a public privacy contact, legal policy text, and official SESC content/asset approvals. These are business inputs, not values Codex should invent.

## Suggested release procedure

### 1. Build a preview

Deploy the reviewed commit to an isolated preview environment. Use non-production Supabase data and credentials. Confirm that no preview URLs are accepted by the production Auth redirect allow-list unless intentionally approved.

### 2. Validate the preview

- Check `/api/health`, the home page, key public routes, 404/error handling, and target mobile/desktop viewports.
- Confirm the browser receives no service-role key and that security headers are present.
- Confirm membership, newsletter, contact, and account-action endpoints reject requests safely until their reviewed gates are enabled; no private data should reach logs.
- Test an applicant, a chapter-scoped officer, a national officer, an auditor, and an unauthorised account after the persistent workflows exist.
- Confirm no placeholder content or unapproved external link is presented as live club information.

### 3. Prepare the database

Link only the intended Supabase project and apply reviewed migrations:

```powershell
supabase link --project-ref <isolated-non-production-project-ref>
supabase db push
```

Never use a service role to bypass a migration or RLS verification. This controlled Preview procedure must never target production. Bootstrap the first synthetic super-administrator through a controlled procedure, then verify role-assignment protections and audit records.

### 4. Promote and validate

Deploy the same tested artifact/configuration, set the canonical domain, and re-run health, public navigation, authentication, RLS, upload, and monitoring checks. Watch application and Supabase logs for safe errors only.

## Rollback and incident handling

- Roll back application code by redeploying the last known-good artifact.
- Do **not** blindly roll database migrations backward: determine whether a forward repair migration is safer, take an authorised backup, and preserve data integrity.
- Disable compromised integrations by rotating/removing their hosting secret and provider key.
- If privacy, access, or payment data may be affected, follow the private incident process in [SECURITY.md](../SECURITY.md); do not publish sensitive details in a public issue.

## Continuous delivery

The committed GitHub Actions workflow runs repository hygiene/static Supabase checks, locked dependency installation, a high-severity npm audit, type checking, linting, unit tests, a production build, browser-bundle scanning, and production-build Playwright smoke tests. It has no deployment or provider credentials. Keep deployment tokens in GitHub/host secrets, protect the deployment branch when repository policy permits it, require review for migrations/security changes, and ensure preview environments cannot send live email or access live private storage.

## Post-launch operations

- Review dependency advisories, host logs, Supabase Auth settings, RLS policy behaviour, and privileged audit events regularly.
- Rotate secrets after personnel changes or a suspected leak.
- Test backups/restores and access-revocation procedures on a schedule approved by the club.
- Track error and performance signals only after the monitoring integration is approved and privacy-reviewed.
