# SESC Web App

The digital platform for the Super Eagles Supporters Club of Nigeria (SESC). It is being designed and developed with [TOPSBORG Technologies Limited](https://topsborgtech.com) as the technology implementation partner under the stated Goods/Services Sponsorship Agreement. The approved public acknowledgement and link-governance rules are recorded in [the TOPSBORG partnership guide](docs/TOPSBORG_PARTNERSHIP.md).

This repository is an in-progress production foundation: it contains the public experience, membership application-readiness UI, dashboard previews, Supabase security migrations, CI, typed fail-closed feature gates, and security controls. Membership and newsletter endpoints deliberately reject submissions before reading data, so the preview cannot be used to collect real membership, payment, identity-document, or subscriber information before the Supabase, storage, authentication, review, rate-limit, and email integrations below are configured and verified.

## Stack

- Next.js 16 App Router, React 19, and TypeScript (strict mode)
- Tailwind CSS 4 plus project CSS tokens and accessible UI components
- Zod validation ready for a protected membership-submission workflow
- Supabase Auth, PostgreSQL, Storage, RLS, and scoped RBAC architecture
- Server-side feature gates, safe authentication callbacks, invitation schema, and private-upload validation
- Vitest, Testing Library, and Playwright for automated checks
- GitHub Actions CI, Dependabot monitoring, and repository-hygiene checks

## Prerequisites

- Node.js 22 or later
- npm 10 or later
- A Supabase project and the Supabase CLI when working with the database
- Optional accounts for Brevo, Cloudflare Turnstile, Sentry, Paystack, and a deployment provider

## Local installation

```powershell
npm ci
Copy-Item docs/environment.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The health endpoint is available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

Never commit `.env.local`, service-role keys, real payment references, or member documents.

## Environment configuration

Copy `docs/environment.example` to an untracked `.env.local`, then set the values appropriate for the environment. The template identifies browser-safe values, server-only secrets, optional integrations, local-development values, and CI-safe false placeholders.

| Variable | Required when | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Any Supabase client/server feature is enabled | Public project URL; browser-safe. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Any Supabase client/server feature is enabled | Public anon key; browser-safe with RLS enabled. |
| `NEXT_PUBLIC_AUTH_ACTIONS_ENABLED` | Account actions are formally approved | Necessary UI setting, but insufficient on its own; the server authentication gate must also be enabled after review. |
| `SUPABASE_SERVICE_ROLE_KEY` | A server-only privileged action is implemented | Never expose it to a client component, log, or public variable. |
| `NEXT_PUBLIC_SITE_URL` | Deployed | Set to the canonical HTTPS origin. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` | Public-form bot protection is enabled | Configure matching Cloudflare hostnames. |
| `BREVO_API_KEY`, `BREVO_SENDER_ADDRESS`, `BREVO_SENDER_NAME` | Transactional or marketing email delivery is approved | Requires a verified sender/domain, preference controls, and a server-side delivery operation. |
| `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` | Sentry monitoring is enabled | Use separate project settings for browser and server telemetry as required. |
| `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | The optional Paystack adapter is enabled | Keep disabled until the club approves its use. |

Every sensitive feature is unavailable by default. Supplying a key alone does not activate email, Paystack, Turnstile, uploads, membership, payments, newsletters, or portal data access. See [production readiness](docs/PRODUCTION_READINESS.md).

## Database setup and migrations

The security foundation lives in `supabase/migrations/`. Read [Supabase setup](docs/SUPABASE_SETUP.md), [docs/DATABASE.md](docs/DATABASE.md), [docs/RBAC.md](docs/RBAC.md), and [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md) before applying it.

For a disposable local Supabase project:

```powershell
supabase start
supabase db reset
```

For a reviewed remote project:

```powershell
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Do not run `db push` against production until the migration has been reviewed, a backup/rollback plan exists, and RLS tests are ready. The repository contains no production seed data; do not create test members from real personal data.

## Everyday commands

```powershell
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run start
node scripts/check-repository-hygiene.mjs
node scripts/verify-supabase-schema.mjs
```

`npm run test:e2e` starts the local development server automatically unless `PLAYWRIGHT_BASE_URL` targets an already-running safe test environment. Install Playwright browsers once if prompted:

```powershell
npx playwright install
```

## Project structure

```text
src/app/                 App Router pages and route handlers
src/components/          Public UI, forms, chrome, and portal previews
src/data/                Typed development-safe public content
src/lib/                 Validation, permissions, Supabase helpers, utilities
src/test/                Shared Vitest setup
supabase/migrations/     Versioned PostgreSQL schema, RLS, and security rules
e2e/                     Playwright smoke coverage
docs/                    Architecture and operational documentation
```

## Roles and access

The initial schema supports visitor, applicant, member, chapter, national, operational, auditor, and super-administrator roles. Roles are scoped at global, national, or chapter level. Browser helpers may hide unavailable UI, but PostgreSQL RLS and server-side permission checks are the authority. See [docs/RBAC.md](docs/RBAC.md).

## Production readiness requirements

Before public launch or accepting real personal data, an authorised operator must provide and configure:

- A Supabase production project, Auth redirect URLs, private Storage buckets, migration/RLS evidence, and the first controlled super-administrator bootstrap process. Keep Auth invite-only (or disable public signup and email delivery) until approved account-operation controls are in place.
- Approved SESC legal policies, public contacts, chapter/leadership records, brand assets, and official manual bank-transfer instructions.
- A deployed HTTPS domain and its canonical `NEXT_PUBLIC_SITE_URL` value.
- A delivery provider and approved sender identity for email, plus templates, delivery-event ownership, and unsubscribe handling for marketing email.
- Cloudflare Turnstile and production-safe rate-limit configuration if public forms are opened.
- A monitoring DSN and alert ownership if Sentry is enabled.
- Verified RLS, privilege-escalation, file-upload, cross-account, cross-chapter, suspension, and role-invitation tests using non-production test data.

See [docs/CI.md](docs/CI.md), [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md), [docs/EMAIL.md](docs/EMAIL.md), [docs/TESTING.md](docs/TESTING.md), and [SECURITY.md](SECURITY.md) for the release procedure.

## Troubleshooting

- **"Supabase is not configured"**: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, then restart the dev server.
- **A privileged server operation fails**: Check that `SUPABASE_SERVICE_ROLE_KEY` exists only in server-side deployment settings. Do not place it in a `NEXT_PUBLIC_` variable.
- **Playwright cannot launch**: Run `npx playwright install`, then retry `npm run test:e2e`.
- **Database policy errors**: Treat them as an authorisation issue, not a reason to disable RLS. Verify the authenticated user, role grant, scope, and policy with a separate test account.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Content management](docs/CONTENT_MANAGEMENT.md)
- [Administrator guide](docs/ADMIN_GUIDE.md)
- [Member guide](docs/MEMBER_GUIDE.md)
- [Testing](docs/TESTING.md)
- [CI](docs/CI.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Membership workflow](docs/MEMBERSHIP_WORKFLOW.md)
- [Payment verification](docs/PAYMENT_VERIFICATION.md)
- [Dependency audit](docs/DEPENDENCY_AUDIT.md)
- [Production readiness](docs/PRODUCTION_READINESS.md)
- [Email operations](docs/EMAIL.md)
- [TOPSBORG partnership](docs/TOPSBORG_PARTNERSHIP.md)
- [Contributing](CONTRIBUTING.md)
