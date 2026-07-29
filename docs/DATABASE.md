# Database

## Applying the schema

The Supabase schema is stored in versioned forward migrations, including:

- supabase/migrations/20260727000000_security_foundation.sql
- supabase/migrations/20260727000001_enable_rls.sql
- supabase/migrations/20260728000000_lock_preproduction_client_writes.sql
- supabase/migrations/20260729000000_add_application_resubmitted_status.sql
- supabase/migrations/20260729000001_production_workflow_foundation.sql
- supabase/migrations/20260729000002_auth_invitation_and_notification_foundation.sql

Use the Supabase CLI against a disposable local project before production:

    supabase start
    supabase db reset
    node scripts/verify-supabase-schema.mjs

Use supabase db push only after linking the intended remote project and
reviewing the migration. The migrations contain no credentials and create no
real member data. The static verifier is a fallback policy/schema check; it
does not replace an executed database or RLS integration test.

## Core relationships

    auth.users --1:1-- profiles
    profiles --< user_roles >-- roles --< role_permissions >-- permissions
    user_roles --> access_scopes --> chapters (for chapter scopes)

    profiles --< membership_applications --< membership_application_steps
    membership_applications --< payments --< payment_receipts
    payments --< payment_verifications
    membership_applications --< member_documents
    membership_applications --1:1-- memberships --< membership_renewals
    profiles --< notifications --1:1-- notification_preferences
    profiles --< role_invitations >-- roles/access_scopes
    profiles/chapters --< audit_log

access_scopes has one global row, one national row, and one generated chapter
row for every chapter. A role may only be assigned at its permitted scope type.
user_chapter_assignments records a member or officer's chapter relationship; it
is separate from role grants.

## Membership workflow

1. The auth.users trigger creates a matching profiles row and gives a base
   visitor role.
2. An applicant creates one open membership_applications record, then submits
   it for a scoped review.
3. A manual payments record is submitted with private receipt storage.
4. A finance officer approves the payment, recording the reviewer and time.
5. An authorised membership officer issues an active membership only from an
   approved application and its approved payment.

Opaque membership verification tokens are exposed only through the
verify_membership_card RPC. It returns public-safe card information only for
an active, unexpired membership.

## Sensitive data

Profile contact data, application details, identity-document paths, payment
receipts, and audit records are private. Do not place raw identity documents,
bank details, tokens, or passwords in metadata, review_notes, or audit-log
JSON. Store metadata for uploads under opaque paths such as:

    private/<auth-user-id>/<random-uuid>

or:

    receipts/<auth-user-id>/<random-uuid>

in either member-private or payment-receipts. Staff access must be brokered by
an authorised server endpoint that returns a short-lived signed URL.

## Schema changes

Create a new timestamped migration for every production change. Do not rewrite
an already-applied migration. Any new table containing member, application,
payment, membership, notification, invitation, or administration data must have
RLS enabled in the same change and tests for both allowed and denied access.
