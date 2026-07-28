# Administrator Guide

## Important current limitation

`/admin` is a static, development-safe interface preview. It is not authenticated operational software and is not connected to real users, applications, payments, content, exports, audit records, or role changes. Do not enter real member data there or use it as evidence that administration is live.

The Supabase migrations define the intended roles, permissions, scopes, and database guardrails. The secure server routes and review interfaces that operate those controls still need to be connected and tested.

## Administrator responsibilities

An authorised administrator should protect member privacy, approve only verified information, keep public content accurate, and ensure staff access matches the minimum required scope. Administrative access is a duty, not a convenience feature.

Never:

- Share accounts, service-role keys, password-reset links, or signed private-file URLs.
- Give a user a broader role because a dashboard looks incomplete.
- Export member data to personal devices or unapproved services.
- Place documents, full payment references, identity data, or private notes in public content or audit metadata.
- Disable RLS or use a browser-only role check to solve an access issue.

## Access model

Roles may be held concurrently and are granted at one of three scopes:

| Scope | Use |
| --- | --- |
| Global | Platform-wide authority; reserved for super-administration. |
| National | Authority across SESC chapters for the assigned capability. |
| Chapter | Authority limited to one linked chapter. |

The database's `has_permission(permission_code, chapter_id)` function and RLS policies are authoritative. A chapter officer should never be able to access another chapter merely because a page renders a control. See [RBAC](RBAC.md) and [RLS policies](RLS_POLICIES.md).

## First super-administrator bootstrap

The schema prevents self-escalation. The first `super_administrator` must be created in a controlled server-side or Supabase Dashboard procedure by an authorised system owner.

Before bootstrap:

1. Obtain written authorisation from the accountable SESC owner.
2. Verify the intended user identity through an independent channel.
3. Use a restricted, audited administrator session.
4. Assign only the required global role/scope.
5. Confirm the audit record and test that the user can administer only through the intended route.
6. Record the responsible owner and a review date outside the public repository.

Do not seed, self-register, or change a profile field to create a super-administrator.

## Intended operational workflows

The following describes the target system once secure administration routes are implemented. It is not a claim that these controls are live today.

### Membership and payment review

1. Review the application only if your permission and scope allow it.
2. Check completeness and request corrections using controlled reasons; do not put sensitive documents in free-text notes.
3. A finance officer verifies payment evidence within their scope and records a decision/audit event.
4. A membership officer issues or activates membership only after the approved workflow conditions are satisfied.
5. The system should notify the applicant through approved channels and expose only public-safe card verification data.

### Role grants

1. Confirm business need, scope, expiry (where appropriate), and approving authority.
2. Grant the least-privilege role at the narrowest scope.
3. Never allow an administrator to grant an equal or higher privilege without the mandated governance approval.
4. Review role grants regularly and revoke promptly when a role, chapter relationship, or engagement ends.
5. Preserve audit history; do not rewrite it to hide mistakes.

### Content and partnership publication

1. Check factual approval, image/logo rights, accessible text, URLs, and publication status.
2. Use review/scheduling controls rather than publishing unverified draft material.
3. For TOPSBORG and every partner, use only the approved description and supplied website/logo. See [TOPSBORG partnership](TOPSBORG_PARTNERSHIP.md).
4. Keep contracts, private sponsor terms, and contact information out of public records unless explicitly approved for publication.

### Exports and audit access

Exports should be server-generated, permission-checked, scoped, logged, encrypted in transit, and limited to the minimum fields/time period required. Auditors need read-only access. Downloaded material must follow the club's approved retention and secure-storage process.

## Daily/weekly checks once live

- Review failed privileged actions, suspicious login events, and unexpected role changes.
- Review pending applications, payment decisions, corrections, and expiring memberships within the authorised scope.
- Check published content for expiry, stale fixtures/events, broken links, and unapproved placeholders.
- Review email delivery errors/suppressions and public-form abuse signals without exposing recipient data.
- Reconcile staff access after leadership/chapter changes.

## Incident response

If you suspect account compromise, accidental disclosure, authorisation bypass, incorrect payment decision, or malicious content publication:

1. Stop the affected action and preserve safe evidence.
2. Revoke/disable access or rotate the relevant secret through the authorised provider process.
3. Notify the designated SESC security/operations contact privately.
4. Do not investigate by downloading unnecessary member data or posting details publicly.
5. Follow [SECURITY.md](../SECURITY.md) and document the remediation through the approved incident process.

## Pre-launch administrator checklist

- [ ] Authentication, password reset, session refresh, and privileged-route guards are implemented and tested.
- [ ] The first super-administrator bootstrap has an approved owner and audit trail.
- [ ] RLS is enabled and cross-account/scoped denial tests pass.
- [ ] Private storage and signed URL controls are tested.
- [ ] Payment instructions and review responsibilities are officially approved.
- [ ] Email, rate limiting, Turnstile, monitoring, backups, and incident ownership are configured where used.
- [ ] Public legal/retention policies and administrator operating procedures are approved.
