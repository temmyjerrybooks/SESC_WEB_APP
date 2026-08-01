# Supabase setup

## Scope

Supabase PostgreSQL, Auth, and private Storage are required for protected SESC workflows. The migrations include RLS, scoped RBAC, account-suspension rules, content/contact/newsletter records, a durable rate-limit RPC, and service-role-only workflow RPCs. This source is a security foundation, not evidence that an environment has executed it correctly. Do not apply migrations to production before a backup, reviewed rollout, and separate non-production validation are available.

## Local disposable environment

1. Install the official Supabase CLI and Docker-compatible local runtime.
2. From the repository root, run supabase start.
3. Run supabase db reset to apply the complete migration chain to the disposable database.
4. Run node scripts/verify-supabase-schema.mjs for static schema and policy-presence verification.
5. Seed only synthetic local identities and run the focused cross-identity RLS harness before considering `SESC_ROW_LEVEL_SECURITY_READY=true`:

```powershell
npm run supabase:seed:local
npm run test:rls
```

The scripts require a reachable local stack and refuse a non-local target unless an explicit disposable-test override is supplied. They require `SESC_LOCAL_TEST_PASSWORD`; set it only in the short-lived shell that runs the synthetic harness and never place it in source control or a Vercel environment.

The repository contains no production seed data. Use only synthetic accounts and explicitly disposable addresses.

## Remote project setup

1. Create separate development, staging, and production Supabase projects.
2. Set public project URL and anonymous key only in the relevant deployment environment.
3. Store the service-role key and any database connection URL only in server-side secret storage.
4. Configure approved Auth redirect URLs and email settings before enabling account actions.
5. Link only the intended non-production project, review migration status, then run supabase db push.
6. Repeat the migration and RLS validation on staging before an authorised production change window.
7. For an isolated, throwaway hosted test project only, set `SESC_ALLOW_DISPOSABLE_SUPABASE_SEED=true` and a temporary `SESC_LOCAL_TEST_PASSWORD` in a secure interactive shell, then run `npm run supabase:seed:local` and `npm run test:rls`. Remove those shell values immediately afterwards. Never use this override against production, shared, or real-member data, and never add either variable to Vercel.

## Storage

The migrations maintain private `member-private`, `payment-receipts`, and `membership-documents` buckets. Private objects have no raw browser policy. Upload bytes pass through a short-lived server-authorised intent; the trusted completion route validates file bytes, MIME type, extension, size, ownership, opaque path, checksum, and database registration before a workflow references an object. Signed read access remains a server-authorised operation and requires live cross-user, replacement, expiry, and deletion tests.

## RLS readiness

The canonical role scope table is `access_scopes` and the canonical audit table is `audit_log`. Private tables are RLS-protected; privileged state transitions are limited to service-role-only RPCs after server authorisation. Static verification proves migration content only. It does not prove SQL execution, PostgreSQL privileges, Auth claims, or live cross-user policy behavior. Keep `SESC_ROW_LEVEL_SECURITY_READY=false` until an isolated local or staging project proves allowed and denied cases, including cross-chapter access attempts, suspension, finance minimisation, invitation, and private-object access.
