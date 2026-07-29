# Supabase setup

## Scope

Supabase PostgreSQL, Auth, and private Storage are required for protected SESC workflows. Do not apply these migrations to production before a backup, reviewed rollout, and separate non-production validation are available.

## Local disposable environment

1. Install the official Supabase CLI and Docker-compatible local runtime.
2. From the repository root, run supabase start.
3. Run supabase db reset to apply the complete migration chain to the disposable database.
4. Run node scripts/verify-supabase-schema.mjs for static schema and policy-presence verification.
5. Run cross-identity RLS tests before considering SESC_ROW_LEVEL_SECURITY_READY=true.

The repository contains no production seed data. Use only synthetic accounts and explicitly disposable addresses.

## Remote project setup

1. Create separate development, staging, and production Supabase projects.
2. Set public project URL and anonymous key only in the relevant deployment environment.
3. Store the service-role key and any database connection URL only in server-side secret storage.
4. Configure approved Auth redirect URLs and email settings before enabling account actions.
5. Link only the intended non-production project, review migration status, then run supabase db push.
6. Repeat the migration and RLS validation on staging before an authorised production change window.

## Storage

The migrations maintain private member-private, payment-receipts, and membership-documents buckets. Private objects have no raw browser policy. A future trusted server operation must validate file bytes, MIME type, extension, size, ownership, random path, reviewer scope, and replacement lifecycle before creating an expiring signed URL.

## RLS readiness

The canonical role scope table is access_scopes and the canonical audit table is audit_log. All private tables have RLS enabled; browser writes are intentionally denied. Static verification proves migration content only. It does not prove SQL execution or live cross-user policy behavior. Keep SESC_ROW_LEVEL_SECURITY_READY=false until an isolated local or staging project proves allowed and denied cases, including cross-chapter access attempts.
