# Security Policy

## Security model

SESC uses Supabase Auth, PostgreSQL row-level security (RLS), scoped role-based
access control (RBAC), private Storage buckets, and append-only audit records.
The browser uses only NEXT_PUBLIC_SUPABASE_URL and
NEXT_PUBLIC_SUPABASE_ANON_KEY. SUPABASE_SERVICE_ROLE_KEY is server-only and
must never be exposed in a client component, public environment variable, log,
or source-control file.

The database migrations in supabase/migrations/ are part of the security
boundary. Do not disable RLS, weaken policies for demos, or edit a user's role
from client-side code.

## Reporting a vulnerability

Do not post potential vulnerabilities, credentials, private member data, or
exploit details in a public issue. Report them through an approved private
SESC/TOPSBORG contact channel. Include the affected route or database object,
reproduction steps, impact, and any suggested mitigation. No public security
contact address has been supplied for this repository.

## Production checklist

- Set every required production secret in the hosting provider, not in Git.
- Apply all migrations and verify RLS with an applicant, a chapter officer, a
  national officer, and an unauthorised account.
- Bootstrap the first super-administrator with a tightly controlled server or
  Dashboard session; the database prevents self-escalation.
- Keep membership evidence in the private member-private and payment-receipts
  buckets. Serve staff files through short-lived signed URLs only after a
  server-side permission check.
- Validate form data and uploaded MIME type, size, path, and ownership on the
  server. Storage policy alone is not file-content validation.
- Use a server-side rate-limit and Turnstile check on public forms, login-adjacent
  routes, and upload endpoints when credentials are configured.
- Record privileged actions without storing raw identity documents, bank details,
  access tokens, password-reset links, or full payment references in audit
  metadata.
- Review dependency advisories, deployment logs, Supabase Auth settings, and
  allowed redirect URLs regularly.

## Operational guardrails

Application status, payment verification, membership activation, profile
management, role assignment, notification mutation, and audit events have
database triggers in addition to RLS. Server routes using the service-role
client must still authenticate the caller and check the relevant permission
before making a privileged write.

See [RBAC](docs/RBAC.md), [RLS policies](docs/RLS_POLICIES.md), and
[database setup](docs/DATABASE.md) for the implementation detail.
