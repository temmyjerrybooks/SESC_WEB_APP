# Local and staging setup

## Current readiness

This repository is deliberately safe by default. The canonical configuration template is [`docs/environment.example`](environment.example); it contains names and safe defaults only, never live values.

At the time of this guide, no deployment credentials have been configured. The local Docker daemon is unavailable, so `supabase start`, `supabase db reset`, seed execution, and live RLS verification have **not** been run. Do not treat static migration checks or a successful frontend build as evidence that a local Supabase environment works.

## Prerequisites

Use a supported development workstation with:

- Node.js 22 or newer and npm 10 or newer.
- Git.
- Docker Desktop (or another Docker-compatible engine) with the daemon running.
- The official Supabase CLI.
- A disposable Supabase project or the local Supabase stack; never use production data for development or testing.

Confirm the toolchain from the repository root:

```powershell
node --version
npm --version
docker version
supabase --version
```

`docker version` must include a reachable **Server** section. If it does not, start Docker Desktop or resolve the engine connection before attempting Supabase commands.

## Install the application

```powershell
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

Install Playwright browsers once per workstation when browser tests are required:

```powershell
npx playwright install
npm run test:e2e
```

Generated dependency folders, browser reports, build output, and test output remain local. Do not add `node_modules`, `.next`, `playwright-report`, or `test-results` to Git.

## Create a local environment file

Copy the canonical template into an ignored local file:

```powershell
Copy-Item docs/environment.example .env.local
git check-ignore -v .env.local
```

The command should identify an ignore rule. Keep `.env.local` on the workstation only. Do not paste credentials into chat, issue trackers, commits, screenshots, shell history, or documentation.

### Configuration categories

| Category | Environment variables | Handling |
| --- | --- | --- |
| Browser-safe Supabase and site settings | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_AUTH_ACTIONS_ENABLED` | Set per environment; the anonymous key is public by design but still relies on RLS. |
| Server-only Supabase settings | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL` | Deployment-secret storage only. Never prefix these with `NEXT_PUBLIC_`. |
| Private storage names | `SUPABASE_MEMBER_PRIVATE_BUCKET`, `SUPABASE_PAYMENT_RECEIPTS_BUCKET`, `SUPABASE_MEMBERSHIP_DOCUMENTS_BUCKET` | Use the expected private bucket names and verify access policies before enabling uploads. |
| Anti-abuse and contact settings | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `SESC_CONTACT_RECIPIENT`, `SESC_SPONSORSHIP_CONTACT` | Keep secrets server-only. Record approved recipients outside source control. |
| Transactional email settings | `BREVO_API_KEY`, `BREVO_SENDER_ADDRESS`, `BREVO_SENDER_NAME` | See [`docs/EMAIL_SETUP.md`](EMAIL_SETUP.md). SMTP template variables remain reserved until a matching adapter is approved and implemented. |
| Optional payment adapter settings | `PAYSTACK_SECRET_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Leave blank until a separate payment and webhook release is authorised. |
| Readiness controls | Every `SESC_*_ENABLED` and `SESC_*_READY` flag in the template | These are literal `true`/`false` deployment controls, not user preferences. Keep them false until their evidence is complete. |

`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and the Firebase variables in the template are optional integrations. They are not a substitute for an approved security, monitoring, or notification design.

## Safe local preview

For ordinary interface work, retain the template defaults:

```text
SESC_PREVIEW_SAFE_MODE=true
SESC_DATABASE_MIGRATIONS_READY=false
SESC_ROW_LEVEL_SECURITY_READY=false
SESC_AUTHENTICATION_ENABLED=false
SESC_MEMBERSHIP_APPLICATIONS_ENABLED=false
SESC_PRIVATE_DOCUMENT_UPLOADS_ENABLED=false
SESC_MANUAL_PAYMENT_VERIFICATION_ENABLED=false
SESC_NEWSLETTER_SUBSCRIPTIONS_ENABLED=false
SESC_EMAIL_DELIVERY_ENABLED=false
SESC_MEMBER_PORTAL_ENABLED=false
SESC_EXECUTIVE_PORTAL_ENABLED=false
SESC_ADMIN_PORTAL_ENABLED=false
```

Then start the preview:

```powershell
npm run dev
```

A disabled workflow is the expected result in this mode. Do not change gates merely to bypass an unavailable screen.

## Disposable local Supabase validation

Run the following only after Docker is available and only against a disposable local stack:

```powershell
supabase start
supabase db reset
node scripts/verify-supabase-schema.mjs
npm run supabase:seed:local
npm run test:rls
supabase status
```

Use the local project URL and anonymous key reported by `supabase status` only in `.env.local`. Obtain any local service-role value directly from the local runtime and keep it in the ignored file. Do not copy it into committed configuration.

The reset command recreates the local database. It must never be pointed at staging or production. Before treating the local environment as ready, create only synthetic identities and perform the cross-identity RLS cases in [`docs/REAL_LIFE_TESTING.md`](REAL_LIFE_TESTING.md).

## Staging setup

Staging is required before real-life testing:

1. Create a Supabase project separate from development and production.
2. Apply reviewed migrations only after a backup and migration plan exist; see [`docs/SUPABASE_SETUP.md`](SUPABASE_SETUP.md).
3. Configure only staging redirect URLs, sender domains, Turnstile hostnames, storage buckets, and test recipients.
4. Place server-only values in the platform secret store, not source files or browser-visible settings.
5. Keep all readiness flags false until the corresponding migration, RLS, storage, abuse-prevention, and workflow evidence has been reviewed.
6. Use non-personal test accounts and synthetic documents and receipts.

## Troubleshooting

| Symptom | Required response |
| --- | --- |
| `docker version` cannot reach the server | Do not run Supabase validation. Start or repair the Docker daemon, then rerun the prerequisite check. |
| `supabase start` or `db reset` fails | Preserve redacted diagnostics, confirm the command targets the local stack, and do not compensate by loosening migrations or RLS. |
| A route reports a feature as unavailable | Inspect the feature's documented prerequisites; do not expose a secret or set a readiness flag without proof. |
| Authentication redirects unexpectedly | Confirm the staging URL, Supabase redirect allow-list, public URL/anon key, and authentication gate evidence. |
| A test exposes a credential or personal record | Stop, revoke or rotate the exposed credential as appropriate, remove the evidence from shared systems, and report through the authorised security channel. |

## Setup exit criteria

A local or staging environment is ready for protected-workflow testing only when the database migration chain has applied successfully, private storage is verified, cross-user RLS denials pass, synthetic accounts can complete the intended test cases, and the responsible SESC owner has reviewed the relevant readiness evidence. Until then, retain safe mode and disabled gates.
