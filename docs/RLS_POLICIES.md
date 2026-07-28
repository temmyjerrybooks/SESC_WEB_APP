# RLS policies

All security-sensitive public-schema tables created by the initial migration
have RLS enabled. Service-role requests bypass RLS, so the service key is
restricted to server code and requires an explicit application-level
authorisation check before use.

## Pre-production write lockdown

20260728000000_lock_preproduction_client_writes.sql intentionally removes
browser/PostgREST write policies for RBAC, applications, payments,
memberships, and private Storage objects. Until reviewed server-side workflows
exist, those operations must not be exposed to an authenticated browser client.
The service-role client may be used only by a future server route that
authenticates the caller, authorises the operation, validates the input, and
records the appropriate audit event.

The table below describes the intended policy model after the relevant secure
workflow is implemented and explicitly reviewed; it is not permission to
remove the pre-production lockdown.

| Resource | Read | Write |
| --- | --- | --- |
| profiles | Owner or scoped profile staff | Owner safe fields or scoped profile manager; trigger protects platform fields |
| chapters | Active rows public; inactive rows scoped staff | Scoped/national chapter managers |
| roles, permissions, role_permissions | Authenticated users | Global role administrators |
| access_scopes, user_roles | Own grants or scope managers | Scope managers; role trigger adds escalation controls |
| user_chapter_assignments | Owner or scoped staff | Scoped chapter/membership managers |
| membership_applications | Owner, scoped reviewer, or payment reviewer | Owner eligible workflow steps or scoped reviewer |
| payments | Payer or scoped finance officer | Payer evidence updates or scoped finance review |
| memberships | Member or scoped membership staff | Scoped membership managers |
| audit_log | Scoped/national audit readers | Server and security-definer audit triggers only |
| notifications | Recipient | Recipient can only change read_at |
| Private Storage objects | Uploader's UUID-prefixed folder | Uploader's UUID-prefixed folder; staff through signed URLs |

## Required verification

After deployment, test with separate accounts:

1. An applicant cannot read another applicant's profile, application, payment,
   receipt, membership, notification, or private object.
2. A chapter officer can review only the chapter matching their role scope.
3. A national officer can access nationwide records only when their role grants
   the relevant permission.
4. A finance officer cannot approve an unrelated payment and cannot alter its
   amount, payer, or application.
5. A member cannot make their own membership active or grant themselves a role.
6. An auditor can read audit records but cannot mutate them.
7. A public card-verification request receives no private profile data and no
   details for an inactive or expired card.

Keep these tests in automated integration coverage as the schema evolves.
