# Deployment Guide

## Release boundary

The current repository can be deployed as a public development preview, but it is not authorised to process real member identity documents, payment evidence, subscriptions, or operational administration. The active membership API returns a development-safe response without persistence, and delivery/anti-bot/monitoring adapters are not yet wired.

Do not turn on a public membership campaign until the prerequisites in this guide and [SECURITY.md](../SECURITY.md) are complete.

## Hosting target

The app is a standard Next.js App Router project and can run on a Node-compatible Next.js host. The project brief favours Cloudflare, but this repository does not currently include OpenNext/Cloudflare adapter packages, a `wrangler` configuration, or a deployment workflow. Add and validate an approved adapter in a focused change before selecting Cloudflare as the production runtime.

Until then, use only a hosting target that supports the repository's current Next.js runtime and server route handlers. Do not claim Cloudflare compatibility merely because the app is planned for it.

## Pre-deployment checklist

1. Review the target commit, migrations, configuration changes, and [CHANGELOG.md](../CHANGELOG.md).
2. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`.
3. Verify all public content is approved or visibly labelled as development content. Replace placeholder legal pages, public links, contacts, and social destinations before launch.
4. Choose a canonical HTTPS domain and set `NEXT_PUBLIC_SITE_URL` exactly to that origin, without a trailing path.
5. Configure Supabase Auth site URL and redirect allow-list for every production and trusted preview URL. Keep public sign-up and email delivery disabled (or invite-only) until approved SMTP, templates, and account-operation controls exist.
6. Review database migrations in a disposable/staging project first. Confirm backup, ownership, and rollback responsibilities before production `db push`.
7. Provision private `member-private` and `payment-receipts` buckets and test their policies with separate test identities.
8. Run the RLS scenarios in [RLS_POLICIES.md](RLS_POLICIES.md) and document the results.

## Deployment configuration

Set values in the host's encrypted environment configuration; never commit them to the repository.

| Setting | Production requirement |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production anonymous key; RLS must be enabled. |
| NEXT_PUBLIC_AUTH_ACTIONS_ENABLED | Keep false until the Supabase-side Auth controls, SMTP, templates, and redirects are approved. This UI flag does not disable Auth REST endpoints. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret, only when a reviewed privileged endpoint uses it. |
| `NEXT_PUBLIC_SITE_URL` | Canonical production HTTPS origin. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Required before public forms rely on Turnstile. |
| `BREVO_API_KEY` | Required only after the reviewed email adapter and verified sender identity exist. |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Required only after Sentry instrumentation is added and alert ownership exists. |
| `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Keep absent/disabled unless the club approves the optional Paystack implementation. |

Other configuration still needed before live operation includes authorised manual bank-transfer instructions, an approved email sender/reply-to identity, a public privacy contact, legal policy text, and official SESC content/asset approvals. These are business inputs, not values Codex should invent.

## Suggested release procedure

### 1. Build a preview

Deploy the reviewed commit to an isolated preview environment. Use non-production Supabase data and credentials. Confirm that no preview URLs are accepted by the production Auth redirect allow-list unless intentionally approved.

### 2. Validate the preview

- Check `/api/health`, the home page, key public routes, 404/error handling, and target mobile/desktop viewports.
- Confirm the browser receives no service-role key and that security headers are present.
- Confirm membership, newsletter, and contact endpoints reject test submissions safely until their reviewed workflows are enabled; no private data should reach logs.
- Test an applicant, a chapter-scoped officer, a national officer, an auditor, and an unauthorised account after the persistent workflows exist.
- Confirm no placeholder content or unapproved external link is presented as live club information.

### 3. Prepare the database

Link only the intended Supabase project and apply reviewed migrations:

```powershell
supabase link --project-ref <production-project-ref>
supabase db push
```

Never use a service role to bypass a migration or RLS verification. Bootstrap the first super-administrator through a controlled procedure, then verify role-assignment protections and audit records.

### 4. Promote and validate

Deploy the same tested artifact/configuration, set the canonical domain, and re-run health, public navigation, authentication, RLS, upload, and monitoring checks. Watch application and Supabase logs for safe errors only.

## Rollback and incident handling

- Roll back application code by redeploying the last known-good artifact.
- Do **not** blindly roll database migrations backward: determine whether a forward repair migration is safer, take an authorised backup, and preserve data integrity.
- Disable compromised integrations by rotating/removing their hosting secret and provider key.
- If privacy, access, or payment data may be affected, follow the private incident process in [SECURITY.md](../SECURITY.md); do not publish sensitive details in a public issue.

## Continuous delivery

No GitHub Actions workflow is committed at present. Before automated production delivery is enabled, add a reviewed workflow that at minimum runs install, typecheck, lint, unit tests, production build, and safe browser smoke tests. Keep deployment tokens in GitHub/host secrets, protect the deployment branch, require review for migrations/security changes, and ensure preview environments cannot send live email or access live private storage.

## Post-launch operations

- Review dependency advisories, host logs, Supabase Auth settings, RLS policy behaviour, and privileged audit events regularly.
- Rotate secrets after personnel changes or a suspected leak.
- Test backups/restores and access-revocation procedures on a schedule approved by the club.
- Track error and performance signals only after the monitoring integration is approved and privacy-reviewed.
