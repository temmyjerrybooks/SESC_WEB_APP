# Authentication and portal protection

## Current architecture

Supabase Auth is integrated through browser-safe anonymous credentials, request-scoped server clients, and server-side protected route checks. The authentication feature gate is server-only and defaults to unavailable. The visible login, registration, recovery, and verification UI requires both the browser-safe approval flag and the server gate; a public URL, cookie, or browser-local value cannot enable it.

The auth callback at /auth/callback exchanges a one-time code on the server and accepts only a local return path. Logout is POST-only at /auth/signout and rejects cross-origin requests.

## Required configuration before enabling

1. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, plus the server-only SUPABASE_SERVICE_ROLE_KEY. Account actions use the latter only for durable server-owned rate limiting; never expose it as a NEXT_PUBLIC_ value.
2. Set NEXT_PUBLIC_SITE_URL to the exact stable HTTPS origin for the controlled environment. A changing pull-request URL is not suitable for callback or reset links.
3. Set SESC_PREVIEW_SAFE_MODE=false only in an approved isolated Preview-as-staging environment; ordinary previews remain fail-closed.
4. Apply and verify every migration, then set SESC_DATABASE_MIGRATIONS_READY=true and SESC_ROW_LEVEL_SECURITY_READY=true only after evidence exists.
5. Configure both NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY, then set SESC_RATE_LIMITING_READY=true only after durable rate-limit behaviour has been verified.
6. Set SESC_AUTHENTICATION_ENABLED=true and NEXT_PUBLIC_AUTH_ACTIONS_ENABLED=true after a security owner approves Auth settings.
7. In Supabase Auth, configure only approved HTTPS redirect URLs for /auth/callback, /email-verification, and /reset-password.
8. Keep public sign-up disabled or invite-only until approved verification, sender, rate-limit, abuse, and support controls are operating.

## Enforcement model

- /member, /executive, and /admin are checked on the server, even after proxy session handling.
- A profile with account_status suspended or deactivated is denied protected access.
- Member access accepts an active membership, member role, or an authorised higher operational role.
- Executive access requires an approved operational/executive role; administrator access requires super_administrator.
- Role codes in a browser profile or navigation state are never trusted.
- Super-administrator assignments remain database-controlled and are recorded as security events.

## Invitations

The role_invitations schema stores a role, scope, inviter, expiry, revocation/acceptance lifecycle, and a SHA-256 token hash. Raw invitation tokens must be generated and delivered only by trusted server code, never stored in the database or browser. There is no browser policy granting direct invitation creation, acceptance, or role assignment. Implement the executive/admin invitation endpoints only after a server operation verifies the authenticated recipient, expiration, scope, and inviter permission, then writes an audit/security event.

## Test requirements

Use disposable identities to verify registration, email confirmation, sign-in, sign-out, refresh, recovery, callback-safe return paths, suspension, higher-role member access, executive denial, administrator denial, and invitation expiry. Do not enable the production gate until these tests pass against Supabase.
