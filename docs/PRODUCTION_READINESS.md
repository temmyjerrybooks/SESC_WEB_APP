# Production readiness

## Current decision

**DO NOT MERGE OR LAUNCH YET.**

The branch now contains CI, Dependabot monitoring, typed fail-closed feature gates, forward Supabase migrations, private-storage validation, authentication hardening, workflow state machines, email-template/adapter foundations, and expanded browser/unit coverage. It does not yet have evidence that a disposable or staging Supabase environment applied the migration chain, enforced RLS across identities, or completed the full server-side membership/payment/newsletter workflow.

## Feature gates

All gates default to unavailable. A deployment must set SESC_PREVIEW_SAFE_MODE=false and the relevant server-only SESC_*_ENABLED flag, then satisfy every prerequisite:

| Feature | Additional prerequisites |
| --- | --- |
| Authentication and portals | Supabase public configuration, applied migrations, verified RLS, approved Auth settings. |
| Private uploads | Service-role secret, migrations, verified RLS, private Storage verification. |
| Membership and manual payments | Authentication and private-upload gates plus reviewed server operations. |
| Newsletter | Supabase/service role, migrations/RLS, email delivery, Turnstile/rate-limit evidence, and reviewed consent operation. |
| Email | Brevo credentials, approved sender, delivery ownership, and an idempotent server queue. |

Health exposes only available or unavailable state names. It never returns a secret, URL, database detail, recipient, or policy diagnostic.

## Mandatory manual configuration

1. Configure separate Supabase staging and production projects, Auth redirect URLs, private buckets, and controlled first super-administrator bootstrap.
2. Apply and verify migrations using synthetic identities; run cross-user, cross-chapter, role-escalation, receipt, signed-URL, and suspension tests.
3. Configure Brevo sender domain, SPF/DKIM, suppression ownership, transactional/marketing separation, and sandbox recipient testing.
4. Configure Cloudflare Turnstile and a production-safe rate-limit provider before public newsletter, contact, auth-adjacent, or upload operations.
5. Confirm canonical HTTPS site URL, contact recipient, sponsorship contact, legal policies, approved manual-bank instructions, data retention, and incident ownership.
6. Configure optional Sentry and Firebase web-push only with separate environment settings and approved privacy treatment.
7. Obtain an online npm advisory report and remediate or formally accept each advisory based on production reachability.
8. Enable branch protection requiring CI checks and review conversation resolution.

## Rollback

Keep every gate false by default. If an enabled workflow behaves unexpectedly, first set its server-side SESC_*_ENABLED flag false and redeploy. Revoke affected provider keys, pause outgoing delivery, preserve only safe audit evidence, and restore from the approved database backup/runbook. Never roll back a production database by editing old migrations; create a reviewed forward corrective migration.
