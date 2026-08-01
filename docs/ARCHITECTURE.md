# Architecture

## Purpose and current state

SESC is a Next.js App Router platform for public supporter content, membership, chapter operations, and authorised administration. The repository establishes the UI, validation, security model, and Supabase migrations needed for that platform.

The public site is usable as a development preview. Trusted server foundations now exist for account actions, contact and newsletter collection, membership draft/submission, document registration, review, profile/content/contact administration, and invitations. Their gates are closed by default; unavailable public workflows reject before reading submitted data. The `/member`, `/executive`, and `/admin` routes remain development-safe previews until Supabase Auth, RLS, and role evidence has been validated in a non-production environment. Do not process real personal data until the required external integrations are configured and tested.

## System overview

```mermaid
flowchart LR
  Browser[Browser] --> Next[Next.js App Router]
  Next --> Pages[Server and client UI]
  Next --> Routes[Route handlers]
  Routes --> Validation[Zod validation and origin/rate checks]
  Routes --> Supabase[Supabase Auth, PostgreSQL, Storage]
  Supabase --> RLS[PostgreSQL RLS and scoped RBAC]
  Routes --> Email[Brevo API adapter - gated]
  Routes --> Monitoring[Sentry adapter - not yet wired]
  Browser --> Turnstile[Cloudflare Turnstile widget and server verification - gated]
```

## Application layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Routes and layouts | `src/app/` | Public pages, portal preview routes, metadata, errors, and API handlers. |
| Reusable interface | `src/components/` | Site chrome, navigation, content patterns, membership-availability notice, and dashboard shells. |
| Domain helpers | `src/lib/` | Membership validation, presentation-only permission helpers, Supabase clients, and utilities. |
| Public development content | `src/data/site-content.ts` | Typed, reviewable placeholder/approved initial content until CMS persistence exists. |
| Data security | `supabase/migrations/` | Profiles, roles, scopes, applications, payments, memberships, notifications, audit records, triggers, and RLS. |
| Test harnesses | `src/**/*.test.*`, `e2e/` | Unit validation and browser smoke coverage. |

## Trust boundaries

### Browser

Only public Supabase URL and anonymous key may reach browser code. Browser-side role helpers, disabled controls, or hidden navigation never establish permission. User-supplied data is untrusted even if client validation has run.

### Next.js server

Route handlers and server actions validate request data, authenticate the user, check the relevant permission and scope, and return safe errors. Membership, contact, newsletter, and account actions fail closed before accepting protected data when their gates are unavailable. Enabling a gate still requires the associated persistence, private upload, review, retention, Turnstile, rate-limit, and staging evidence.

### Supabase

Supabase Auth represents identity. PostgreSQL roles, `user_roles`, `access_scopes`, and `has_permission()` define authorisation. RLS is the final data boundary. A service-role key bypasses RLS and may be used only in server-only modules after an explicit application-level permission check.

### Storage

Identity documents and payment receipts belong in private buckets and UUID-prefixed paths. Upload bytes are server-proxied through a short-lived, service-authorised intent; the server validates size, MIME type, magic bytes, ownership, checksum, opaque path, and authorisation before database registration. Any signed read URL remains a short-lived, server-authorised operation. Public buckets must never contain member evidence.

## Request flows

### Public content

Public routes render typed content from `src/data/site-content.ts` today. A future CMS must preserve draft/review/published states, metadata, revisions, author attribution, and audit history before replacing this source.

### Membership application (target flow)

1. The browser validates for usability; the server validates the same payload.
2. The server requires a session, anti-abuse controls, and a safe chapter/category selection.
3. A draft/application and private upload metadata are created in Supabase.
4. A payment record is submitted for manual bank-transfer review.
5. Scoped finance and membership officers review only permitted records.
6. An approved payment can lead to membership issuance; database triggers and RLS enforce the transitions.
7. The public verifier exposes only safe active-card information.

The migrations and server route/RPC foundations implement guarded contracts for this flow. They have not yet been proven by live Supabase/Auth/Storage/RLS integration tests, so the gates remain disabled.

## Identity and roles

The schema supports multiple grants per user at global, national, or chapter scope. The core role families include visitor/applicant/member; chapter leadership; national executives; operational officers; auditors; and super-administrators. See [RBAC](RBAC.md) and [RLS policies](RLS_POLICIES.md).

The first `super_administrator` is deliberately not self-assignable. Bootstrap it through a controlled Supabase Dashboard or server operation, document who performed it, and verify the resulting audit record.

## External integrations and required configuration

| Integration | Required for | Current repository state |
| --- | --- | --- |
| Supabase | Authenticated features, persistence, RLS, Storage | Schema and helpers exist; production project/configuration is still required. |
| Brevo | Email delivery | Server-only API adapter and templates exist; credentials, approved sender, staging delivery evidence, and the email gate are still required. |
| Cloudflare Turnstile | Public-form bot protection | Browser widget and server verification path exist; hostname keys and staging abuse evidence are still required. |
| Sentry | Error monitoring | Variables are represented; SDK/configuration is not implemented. |
| Paystack | Optional electronic payments | Variables are represented; adapter is intentionally disabled/not implemented. |
| Hosting/DNS | Public deployment | No provider-specific deployment adapter is committed. |

## Non-negotiable design rules

- Keep privileged keys server-only and outside Git.
- Apply new migrations; never alter production history in place.
- Retain RLS and policy tests for both permitted and forbidden actions.
- Avoid using development content as real club news, contacts, leadership data, legal terms, or event arrangements.
- Add observability without recording identity documents, payment evidence, access tokens, or unnecessary personal data.

## Related documents

- [Database](DATABASE.md)
- [RBAC](RBAC.md)
- [RLS policies](RLS_POLICIES.md)
- [Deployment](DEPLOYMENT.md)
- [Testing](TESTING.md)
