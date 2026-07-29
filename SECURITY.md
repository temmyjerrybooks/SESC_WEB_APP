# Security policy

## Security model

SESC uses Supabase Auth, PostgreSQL RLS, scoped RBAC, private Storage, server-side authorisation, hashed invitation tokens, audit records, security events, and fail-closed feature gates. Browser code uses only public Supabase settings. The service-role key, database URL, provider keys, SMTP credentials, Turnstile secret, and administrative settings are server-only and must never appear in browser code, logs, source control, or an error response.

Migrations under supabase/migrations are part of the security boundary. Do not disable RLS, reinstate browser write policies for a demo, or use client input to set roles, scope, approval, verification, membership number, document path, or payment status.

## Current production posture

Sensitive workflows are unavailable by default. Membership, private upload, payment verification, newsletter, email delivery, and protected production portal data require explicit server-side gates plus the documented configuration and validation evidence. A missing or malformed setting fails closed.

The application rejects unsafe auth return paths, handles callback exchange on the server, checks account suspension for protected portals, and uses server-side role/membership checks after proxy session handling. Logout is POST-only.

## Required controls before activation

- Apply and test every migration in a disposable/staging Supabase project.
- Verify cross-user, cross-chapter, finance-minimisation, suspension, invitation, signed-URL, and privilege-escalation denial cases.
- Configure Supabase Auth redirect URLs, account policy, and controlled super-administrator bootstrap.
- Validate uploaded bytes, declared MIME type, extension, size, checksum, random path, ownership, and reviewer scope on the server.
- Use an approved server-side rate limit and Turnstile verification for public collection routes.
- Use short-lived signed URLs for private objects and never place raw document/receipt paths in public responses or email.
- Record privileged events without passwords, tokens, keys, full document content, or full payment evidence.
- Review dependency advisories and CI results before merge.

## Reporting a vulnerability

Do not post potential vulnerabilities, credentials, private member data, or exploit details in a public issue. Report through an approved private SESC/TOPSBORG contact channel with affected route/object, reproduction steps, impact, and mitigation. No public security contact address has been approved for this repository.

## Incident response

Disable the affected server gate first. Revoke/rotate exposed provider credentials in the provider and deployment host, pause delivery or uploads when relevant, preserve only safe diagnostics, assess affected records with authorised owners, apply a forward corrective migration where needed, and document the release decision. Do not publish sensitive evidence or use a Git history rewrite as a substitute for provider-side credential rotation.
