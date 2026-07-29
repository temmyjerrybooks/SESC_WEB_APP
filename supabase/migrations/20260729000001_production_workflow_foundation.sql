-- Production workflow schema and RLS foundation.
--
-- This migration is deliberately forward-only. It completes the missing
-- workflow records while retaining the pre-production rule that browser
-- clients cannot mutate protected data directly. Trusted server code using
-- the service-role key remains responsible for validated, audited workflows.

begin;

create type public.membership_plan_status as enum ('draft', 'active', 'archived');
create type public.application_step_status as enum (
  'not_started',
  'in_progress',
  'completed',
  'needs_correction'
);
create type public.member_document_kind as enum (
  'profile_photo',
  'identity_document',
  'membership_certificate',
  'other'
);
create type public.member_document_status as enum (
  'pending',
  'verified',
  'rejected',
  'superseded',
  'deleted'
);
create type public.membership_renewal_status as enum (
  'draft',
  'pending_payment',
  'pending_review',
  'approved',
  'rejected',
  'cancelled',
  'expired'
);
create type public.payment_receipt_status as enum (
  'submitted',
  'needs_replacement',
  'accepted',
  'rejected',
  'superseded'
);
create type public.payment_verification_decision as enum (
  'approved',
  'rejected',
  'needs_resubmission'
);
create type public.newsletter_subscription_status as enum (
  'pending',
  'active',
  'unsubscribed',
  'suppressed'
);
create type public.security_event_severity as enum (
  'info',
  'warning',
  'high',
  'critical'
);

-- Membership plan configuration is managed by trusted server-side operations.
-- Only active, expressly public plans may be shown in a browser.
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category_code text not null unique,
  amount_minor integer not null default 0,
  currency char(3) not null default 'NGN',
  term_months smallint not null default 12,
  status public.membership_plan_status not null default 'draft',
  is_public boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint membership_plans_code_format check (
    code ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint membership_plans_name_length check (
    char_length(trim(name)) between 2 and 160
  ),
  constraint membership_plans_category_length check (
    char_length(trim(category_code)) between 2 and 60
  ),
  constraint membership_plans_amount_nonnegative check (amount_minor >= 0),
  constraint membership_plans_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint membership_plans_term_range check (term_months between 1 and 60),
  constraint membership_plans_public_requires_active check (
    not is_public or status = 'active'
  )
);

create index membership_plans_public_active_idx
  on public.membership_plans (category_code, amount_minor)
  where status = 'active' and is_public;

alter table public.membership_applications
  add column if not exists membership_plan_id uuid
    references public.membership_plans (id) on delete restrict,
  add column if not exists correction_requested_at timestamptz,
  add column if not exists resubmitted_at timestamptz;

alter table public.membership_applications
  drop constraint if exists membership_applications_step_range;
alter table public.membership_applications
  add constraint membership_applications_step_range
  check (current_step between 1 and 13) not valid;
alter table public.membership_applications
  add constraint membership_applications_correction_timestamp_check
  check (
    status <> 'requires_correction'
    or correction_requested_at is not null
  ) not valid;
alter table public.membership_applications
  add constraint membership_applications_resubmission_timestamp_check
  check (
    status <> 'resubmitted'
    or resubmitted_at is not null
  ) not valid;

drop index if exists public.membership_applications_one_open_per_user_idx;
create unique index membership_applications_one_open_per_user_idx
  on public.membership_applications (applicant_id)
  where status in (
    'draft',
    'submitted',
    'under_review',
    'requires_correction',
    'resubmitted'
  );
create index membership_applications_plan_status_idx
  on public.membership_applications (membership_plan_id, status, created_at desc);

-- One row describes the state of each independently validated application step.
-- PII is stored only in the applicant/reviewer workflow and is never exposed
-- to finance roles.
create table public.membership_application_steps (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.membership_applications (id) on delete cascade,
  step_number smallint not null,
  step_key text not null,
  status public.application_step_status not null default 'not_started',
  data jsonb not null default '{}'::jsonb,
  validation_errors jsonb not null default '{}'::jsonb,
  correction_note text,
  completed_at timestamptz,
  validated_at timestamptz,
  validated_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint membership_application_steps_number_range check (
    step_number between 1 and 13
  ),
  constraint membership_application_steps_key_format check (
    step_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'
  ),
  constraint membership_application_steps_data_object check (
    jsonb_typeof(data) = 'object'
  ),
  constraint membership_application_steps_errors_object check (
    jsonb_typeof(validation_errors) = 'object'
  ),
  constraint membership_application_steps_correction_length check (
    correction_note is null or char_length(trim(correction_note)) between 1 and 2000
  ),
  constraint membership_application_steps_completed_timestamp_check check (
    status <> 'completed' or completed_at is not null
  ),
  constraint membership_application_steps_unique_key unique (application_id, step_key),
  constraint membership_application_steps_unique_number unique (application_id, step_number)
);

create index membership_application_steps_application_status_idx
  on public.membership_application_steps (application_id, status, step_number);

-- Metadata for private applicant and member documents. Object paths are opaque,
-- random UUID paths; raw object access is denied to browser roles below.
create table public.member_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  application_id uuid
    references public.membership_applications (id) on delete restrict,
  membership_id uuid references public.memberships (id) on delete restrict,
  document_kind public.member_document_kind not null,
  status public.member_document_status not null default 'pending',
  bucket_id text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_extension text not null,
  byte_size integer not null,
  checksum_sha256 char(64) not null,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint member_documents_subject_shape check (
    (application_id is not null and membership_id is null)
    or (application_id is null and membership_id is not null)
  ),
  constraint member_documents_kind_subject_shape check (
    (
      document_kind in ('profile_photo', 'identity_document')
      and application_id is not null
      and membership_id is null
    )
    or (
      document_kind = 'membership_certificate'
      and membership_id is not null
      and application_id is null
    )
    or (
      document_kind = 'other'
    )
  ),
  constraint member_documents_bucket_allowed check (
    bucket_id in ('member-private', 'membership-documents')
  ),
  constraint member_documents_storage_path_randomised check (
    storage_path ~ '^private/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint member_documents_mime_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  constraint member_documents_extension_allowed check (
    file_extension in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
  ),
  constraint member_documents_extension_matches_mime check (
    (mime_type = 'image/jpeg' and file_extension in ('jpg', 'jpeg'))
    or (mime_type = 'image/png' and file_extension = 'png')
    or (mime_type = 'image/webp' and file_extension = 'webp')
    or (mime_type = 'application/pdf' and file_extension = 'pdf')
  ),
  constraint member_documents_size_range check (
    byte_size between 1 and 5242880
  ),
  constraint member_documents_checksum_format check (
    checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint member_documents_review_details_required check (
    status not in ('verified', 'rejected')
    or (reviewed_by is not null and reviewed_at is not null)
  ),
  constraint member_documents_rejection_reason_length check (
    rejection_reason is null
    or char_length(trim(rejection_reason)) between 1 and 2000
  )
);

create unique index member_documents_one_current_subject_kind_idx
  on public.member_documents (
    coalesce(application_id, membership_id),
    document_kind
  )
  where status in ('pending', 'verified');
create index member_documents_owner_status_idx
  on public.member_documents (owner_id, status, created_at desc);
create index member_documents_review_queue_idx
  on public.member_documents (status, created_at asc)
  where status = 'pending';

-- Renewal records deliberately remain separate from memberships so issuance
-- history and open requests cannot be overwritten by a browser client.
create table public.membership_renewals (
  id uuid primary key default gen_random_uuid(),
  renewal_number bigint generated always as identity unique,
  reference_code text generated always as (
    'SESC-R-' || lpad(renewal_number::text, 10, '0')
  ) stored unique,
  membership_id uuid not null references public.memberships (id) on delete restrict,
  member_id uuid not null references public.profiles (id) on delete restrict,
  membership_plan_id uuid references public.membership_plans (id) on delete restrict,
  status public.membership_renewal_status not null default 'draft',
  requested_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  decision_notes text,
  renewed_from date,
  renewed_to date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint membership_renewals_dates check (
    renewed_from is null
    or renewed_to is null
    or renewed_to >= renewed_from
  ),
  constraint membership_renewals_review_details_required check (
    status not in ('approved', 'rejected')
    or (reviewed_by is not null and reviewed_at is not null)
  ),
  constraint membership_renewals_decision_notes_length check (
    decision_notes is null
    or char_length(trim(decision_notes)) between 1 and 2000
  )
);

create unique index membership_renewals_one_open_per_membership_idx
  on public.membership_renewals (membership_id)
  where status in ('draft', 'pending_payment', 'pending_review');
create index membership_renewals_member_status_idx
  on public.membership_renewals (member_id, status, requested_at desc);
create index membership_renewals_review_queue_idx
  on public.membership_renewals (status, requested_at asc)
  where status = 'pending_review';

-- Receipt metadata is stored separately from the payment's public-facing
-- status. The private object path is never returned from finance queue RPCs.
create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  receipt_version smallint not null default 1,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  status public.payment_receipt_status not null default 'submitted',
  bucket_id text not null default 'payment-receipts',
  storage_path text not null unique,
  mime_type text not null,
  file_extension text not null,
  byte_size integer not null,
  checksum_sha256 char(64) not null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_receipts_payment_version_unique unique (payment_id, receipt_version),
  constraint payment_receipts_bucket_allowed check (bucket_id = 'payment-receipts'),
  constraint payment_receipts_storage_path_randomised check (
    storage_path ~ '^receipts/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint payment_receipts_mime_allowed check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
  ),
  constraint payment_receipts_extension_allowed check (
    file_extension in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
  ),
  constraint payment_receipts_extension_matches_mime check (
    (mime_type = 'image/jpeg' and file_extension in ('jpg', 'jpeg'))
    or (mime_type = 'image/png' and file_extension = 'png')
    or (mime_type = 'image/webp' and file_extension = 'webp')
    or (mime_type = 'application/pdf' and file_extension = 'pdf')
  ),
  constraint payment_receipts_size_range check (byte_size between 1 and 5242880),
  constraint payment_receipts_checksum_format check (
    checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint payment_receipts_review_details_required check (
    status not in ('accepted', 'rejected')
    or (reviewed_by is not null and reviewed_at is not null)
  ),
  constraint payment_receipts_review_notes_length check (
    review_notes is null
    or char_length(trim(review_notes)) between 1 and 2000
  )
);

create unique index payment_receipts_one_current_per_payment_idx
  on public.payment_receipts (payment_id)
  where status in ('submitted', 'needs_replacement', 'accepted');
create index payment_receipts_review_queue_idx
  on public.payment_receipts (status, created_at asc)
  where status in ('submitted', 'needs_replacement');

-- Only one current verification may exist for a payment. Superseded attempts
-- preserve a tamper-evident review history when a receipt is replaced.
create table public.payment_verifications (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  attempt_number smallint not null default 1,
  decision public.payment_verification_decision not null,
  verified_by uuid not null references public.profiles (id) on delete restrict,
  verified_at timestamptz not null default timezone('utc', now()),
  notes text,
  is_current boolean not null default true,
  superseded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payment_verifications_attempt_positive check (attempt_number >= 1),
  constraint payment_verifications_payment_attempt_unique unique (
    payment_id,
    attempt_number
  ),
  constraint payment_verifications_current_state check (
    (is_current and superseded_at is null)
    or (not is_current and superseded_at is not null)
  ),
  constraint payment_verifications_notes_length check (
    notes is null or char_length(trim(notes)) between 1 and 2000
  )
);

create unique index payment_verifications_one_current_per_payment_idx
  on public.payment_verifications (payment_id)
  where is_current;
create index payment_verifications_reviewer_idx
  on public.payment_verifications (verified_by, verified_at desc);

-- Newsletter consent remains private and server-written. A single address has
-- one durable record so unsubscribes and suppression cannot be bypassed by a
-- duplicate browser request.
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  status public.newsletter_subscription_status not null default 'pending',
  consented_at timestamptz,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  source_page text,
  consent_ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_subscribers_email_nonempty check (
    char_length(trim(email::text)) between 3 and 320
  ),
  constraint newsletter_subscribers_source_page_length check (
    source_page is null or char_length(trim(source_page)) between 1 and 500
  ),
  constraint newsletter_subscribers_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint newsletter_subscribers_consent_timestamp_check check (
    status not in ('active', 'unsubscribed')
    or consented_at is not null
  ),
  constraint newsletter_subscribers_unsubscribe_timestamp_check check (
    status <> 'unsubscribed' or unsubscribed_at is not null
  )
);

create index newsletter_subscribers_status_created_idx
  on public.newsletter_subscribers (status, created_at desc);

-- Recipients may read their preferences once an authorised server operation
-- has provisioned them; all mutations remain server-only during pre-production.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  application_enabled boolean not null default true,
  payment_enabled boolean not null default true,
  membership_enabled boolean not null default true,
  chapter_enabled boolean not null default true,
  system_enabled boolean not null default true,
  email_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Security events are intentionally separate from routine audit events so
-- access can be limited to authorised auditors and incident responders.
create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_id uuid references public.profiles (id) on delete set null,
  subject_user_id uuid references public.profiles (id) on delete set null,
  chapter_id uuid references public.chapters (id) on delete set null,
  event_type text not null,
  severity public.security_event_severity not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  request_id uuid,
  ip_hash text,
  user_agent_hash text,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint security_events_event_type_length check (
    char_length(trim(event_type)) between 3 and 120
  ),
  constraint security_events_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint security_events_metadata_has_no_top_level_secrets check (
    not (
      metadata ?| array[
        'password',
        'access_token',
        'refresh_token',
        'service_role_key',
        'authorization',
        'identity_document',
        'receipt_contents'
      ]
    )
  ),
  constraint security_events_resolution_timestamp_check check (
    resolved_at is null or resolved_at >= occurred_at
  ),
  constraint security_events_resolution_notes_length check (
    resolution_notes is null
    or char_length(trim(resolution_notes)) between 1 and 2000
  )
);

create index security_events_occurred_at_idx
  on public.security_events (occurred_at desc);
create index security_events_severity_open_idx
  on public.security_events (severity, occurred_at desc)
  where resolved_at is null;
create index security_events_subject_idx
  on public.security_events (subject_user_id, occurred_at desc);
create index security_events_chapter_idx
  on public.security_events (chapter_id, occurred_at desc);

-- The previous migration used requires_correction as the canonical enum label.
-- This trigger completes timestamp enforcement for that label and the newer
-- resubmitted state, including trusted server-side transitions.
create or replace function public.set_membership_application_workflow_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('submitted', 'resubmitted') and new.submitted_at is null then
    new.submitted_at := timezone('utc', now());
  end if;

  if new.status = 'requires_correction'
    and (tg_op = 'INSERT' or new.status is distinct from old.status)
    and new.correction_requested_at is null then
    new.correction_requested_at := timezone('utc', now());
  end if;

  if new.status = 'resubmitted'
    and (tg_op = 'INSERT' or new.status is distinct from old.status)
    and new.resubmitted_at is null then
    new.resubmitted_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.guard_membership_application_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  is_reviewer boolean;
begin
  if tg_op = 'INSERT' then
    if actor_id is not null then
      if new.applicant_id <> actor_id then
        raise exception 'Applications may only be created for the current user';
      end if;
      if new.status not in ('draft', 'submitted') then
        raise exception 'Applications must begin as a draft or submitted application';
      end if;
      if new.reviewed_by is not null
        or new.reviewed_at is not null
        or new.review_notes is not null
        or new.correction_requested_at is not null
        or new.resubmitted_at is not null then
        raise exception 'Applicants cannot set review or workflow approval fields';
      end if;
    end if;
    return new;
  end if;

  -- Service-role operations are trusted application-server operations. Browser
  -- clients cannot reach this trigger through PostgREST because DML is revoked
  -- and no write RLS policies exist below.
  if actor_id is null then
    return new;
  end if;

  if actor_id = old.applicant_id then
    if new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_notes is distinct from old.review_notes
      or new.correction_requested_at is distinct from old.correction_requested_at
      or new.applicant_id is distinct from old.applicant_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Applicants cannot modify review, ownership, or correction fields';
    end if;

    if (old.status = 'draft' and new.status not in ('draft', 'submitted', 'withdrawn'))
      or (
        old.status = 'requires_correction'
        and new.status not in ('requires_correction', 'resubmitted', 'withdrawn')
      )
      or (
        old.status = 'resubmitted'
        and new.status not in ('resubmitted', 'withdrawn')
      )
      or (old.status = 'submitted' and new.status <> 'withdrawn')
      or (
        old.status not in (
          'draft',
          'requires_correction',
          'resubmitted',
          'submitted'
        )
      ) then
      raise exception 'This application cannot be changed at its current status';
    end if;

    return new;
  end if;

  is_reviewer := public.has_permission('application.review.chapter', old.chapter_id)
    or public.has_permission('application.review.national', old.chapter_id)
    or public.has_permission('membership.manage', old.chapter_id);

  if not is_reviewer then
    raise exception 'Not authorised to review this application';
  end if;

  if new.applicant_id is distinct from old.applicant_id
    or new.chapter_id is distinct from old.chapter_id
    or new.membership_plan_id is distinct from old.membership_plan_id
    or new.first_name is distinct from old.first_name
    or new.last_name is distinct from old.last_name
    or new.date_of_birth is distinct from old.date_of_birth
    or new.phone is distinct from old.phone
    or new.residence_country is distinct from old.residence_country
    or new.address_line_1 is distinct from old.address_line_1
    or new.address_line_2 is distinct from old.address_line_2
    or new.city is distinct from old.city
    or new.state_or_region is distinct from old.state_or_region
    or new.postal_code is distinct from old.postal_code
    or new.emergency_contact is distinct from old.emergency_contact
    or new.profile_photo_path is distinct from old.profile_photo_path
    or new.identity_document_path is distinct from old.identity_document_path
    or new.declaration_accepted_at is distinct from old.declaration_accepted_at
    or new.privacy_consent_at is distinct from old.privacy_consent_at
    or new.submitted_at is distinct from old.submitted_at
    or new.resubmitted_at is distinct from old.resubmitted_at
    or new.withdrawn_at is distinct from old.withdrawn_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Reviewers cannot modify applicant-supplied or ownership fields';
  end if;

  if new.status not in (
    'under_review',
    'requires_correction',
    'approved',
    'rejected',
    old.status
  ) then
    raise exception 'Reviewers must use an authorised application review status';
  end if;

  if new.status in ('under_review', 'requires_correction', 'approved', 'rejected')
    and new.status is distinct from old.status then
    new.reviewed_by := actor_id;
    new.reviewed_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.validate_member_document_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_owner_id uuid;
begin
  if tg_op = 'UPDATE'
    and (
      new.owner_id is distinct from old.owner_id
      or new.application_id is distinct from old.application_id
      or new.membership_id is distinct from old.membership_id
      or new.uploaded_by is distinct from old.uploaded_by
      or new.storage_path is distinct from old.storage_path
    ) then
    raise exception 'Document ownership and storage identity are immutable';
  end if;

  if new.application_id is not null then
    select applicant_id
    into expected_owner_id
    from public.membership_applications
    where id = new.application_id;
  else
    select member_id
    into expected_owner_id
    from public.memberships
    where id = new.membership_id;
  end if;

  if expected_owner_id is null
    or new.owner_id <> expected_owner_id
    or new.uploaded_by <> expected_owner_id then
    raise exception 'Document owner must match its application or membership owner';
  end if;

  return new;
end;
$$;

create or replace function public.validate_membership_renewal_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_member_id uuid;
begin
  if tg_op = 'UPDATE'
    and (
      new.membership_id is distinct from old.membership_id
      or new.member_id is distinct from old.member_id
      or new.created_at is distinct from old.created_at
    ) then
    raise exception 'Renewal ownership is immutable';
  end if;

  select member_id
  into expected_member_id
  from public.memberships
  where id = new.membership_id;

  if expected_member_id is null or new.member_id <> expected_member_id then
    raise exception 'Renewal member must match the membership owner';
  end if;

  return new;
end;
$$;

create or replace function public.validate_payment_receipt_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  expected_payer_id uuid;
begin
  if tg_op = 'UPDATE'
    and (
      new.payment_id is distinct from old.payment_id
      or new.uploaded_by is distinct from old.uploaded_by
      or new.receipt_version is distinct from old.receipt_version
      or new.storage_path is distinct from old.storage_path
      or new.created_at is distinct from old.created_at
    ) then
    raise exception 'Receipt payment ownership and storage identity are immutable';
  end if;

  select payer_id
  into expected_payer_id
  from public.payments
  where id = new.payment_id;

  if expected_payer_id is null or new.uploaded_by <> expected_payer_id then
    raise exception 'Receipt uploader must match the payment payer';
  end if;

  return new;
end;
$$;

create or replace function public.can_read_membership_application(
  requested_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.membership_applications as application
    where application.id = requested_application_id
      and (
        application.applicant_id = auth.uid()
        or public.has_permission('application.review.chapter', application.chapter_id)
        or public.has_permission('application.review.national', application.chapter_id)
        or public.has_permission('membership.manage', application.chapter_id)
      )
  );
$$;

create or replace function public.can_review_payment(requested_payment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payments as payment
    join public.membership_applications as application
      on application.id = payment.application_id
    where payment.id = requested_payment_id
      and public.has_permission('payment.review', application.chapter_id)
  );
$$;

create or replace function public.is_membership_holder(requested_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.id = requested_membership_id
      and membership.member_id = auth.uid()
  );
$$;

create or replace function public.can_manage_membership(requested_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships as membership
    where membership.id = requested_membership_id
      and public.has_permission('membership.manage', membership.chapter_id)
  );
$$;

-- This helper no longer grants finance roles visibility of raw payment rows.
-- Finance access is limited to the minimal queue projection below.
create or replace function public.can_access_payment(requested_payment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.payments as payment
    where payment.id = requested_payment_id
      and payment.payer_id = auth.uid()
  );
$$;

create or replace function public.finance_payment_queue(
  requested_status public.payment_status default null,
  maximum_rows integer default 100
)
returns table (
  payment_id uuid,
  payment_reference text,
  application_reference text,
  chapter_id uuid,
  amount_minor integer,
  currency char(3),
  payment_method public.payment_method,
  payment_status public.payment_status,
  receipt_received boolean,
  verification_decision public.payment_verification_decision,
  submitted_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to inspect the finance queue';
  end if;

  if maximum_rows < 1 or maximum_rows > 100 then
    raise exception 'maximum_rows must be between 1 and 100';
  end if;

  return query
  select
    payment.id,
    payment.reference_code,
    application.reference_code,
    application.chapter_id,
    payment.amount_minor,
    payment.currency,
    payment.method,
    payment.status,
    exists (
      select 1
      from public.payment_receipts as receipt
      where receipt.payment_id = payment.id
        and receipt.status in ('submitted', 'needs_replacement', 'accepted')
    ),
    verification.decision,
    payment.submitted_at,
    payment.updated_at
  from public.payments as payment
  join public.membership_applications as application
    on application.id = payment.application_id
  left join lateral (
    select current_verification.decision
    from public.payment_verifications as current_verification
    where current_verification.payment_id = payment.id
      and current_verification.is_current
    limit 1
  ) as verification on true
  where public.has_permission('payment.review', application.chapter_id)
    and (requested_status is null or payment.status = requested_status)
  order by payment.created_at asc
  limit maximum_rows;
end;
$$;

create or replace function public.guard_payment_verification_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  payment_chapter_id uuid;
  current_payment_status public.payment_status;
begin
  if tg_op = 'UPDATE'
    and (
      new.payment_id is distinct from old.payment_id
      or new.attempt_number is distinct from old.attempt_number
      or new.verified_by is distinct from old.verified_by
      or new.verified_at is distinct from old.verified_at
    ) then
    raise exception 'Verification identity is immutable';
  end if;

  select application.chapter_id, payment.status
  into payment_chapter_id, current_payment_status
  from public.payments as payment
  join public.membership_applications as application
    on application.id = payment.application_id
  where payment.id = new.payment_id;

  if payment_chapter_id is null then
    raise exception 'Payment does not exist';
  end if;

  if actor_id is not null then
    if not public.has_permission('payment.review', payment_chapter_id) then
      raise exception 'Not authorised to record this payment verification';
    end if;
    if new.verified_by <> actor_id then
      raise exception 'Verification identity must be the authorised reviewer';
    end if;
  end if;

  if (new.decision = 'approved' and current_payment_status <> 'approved')
    or (new.decision = 'rejected' and current_payment_status <> 'rejected')
    or (
      new.decision = 'needs_resubmission'
      and current_payment_status <> 'needs_resubmission'
    ) then
    raise exception 'Payment status must match the recorded verification decision';
  end if;

  if tg_op = 'UPDATE' and old.is_current = false then
    raise exception 'Superseded verification records are immutable';
  end if;

  if tg_op = 'UPDATE'
    and old.is_current
    and not new.is_current
    and new.superseded_at is null then
    new.superseded_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.audit_payment_verification_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  verification public.payment_verifications;
  payment_owner_id uuid;
  payment_chapter_id uuid;
  audit_action text;
begin
  if tg_op = 'DELETE' then
    verification := old;
    audit_action := 'payment.verification.deleted';
  elsif tg_op = 'INSERT' then
    verification := new;
    audit_action := 'payment.verification.recorded';
  elsif old.is_current and not new.is_current then
    verification := new;
    audit_action := 'payment.verification.superseded';
  else
    verification := new;
    audit_action := 'payment.verification.updated';
  end if;

  select payment.payer_id, application.chapter_id
  into payment_owner_id, payment_chapter_id
  from public.payments as payment
  join public.membership_applications as application
    on application.id = payment.application_id
  where payment.id = verification.payment_id;

  insert into public.audit_log (
    actor_id,
    subject_user_id,
    chapter_id,
    entity_type,
    entity_id,
    action,
    metadata
  )
  values (
    auth.uid(),
    payment_owner_id,
    payment_chapter_id,
    'payment_verification',
    verification.id,
    audit_action,
    jsonb_build_object(
      'payment_id',
      verification.payment_id,
      'attempt_number',
      verification.attempt_number,
      'decision',
      verification.decision
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.audit_super_administrator_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.user_roles;
  assigned_role_code text;
  assigned_chapter_id uuid;
  event_action text;
begin
  if tg_op = 'DELETE' then
    assignment := old;
    event_action := 'super_administrator.assignment.deleted';
  elsif tg_op = 'INSERT' then
    assignment := new;
    event_action := 'super_administrator.assignment.created';
  elsif old.revoked_at is null and new.revoked_at is not null then
    assignment := new;
    event_action := 'super_administrator.assignment.revoked';
  else
    assignment := new;
    event_action := 'super_administrator.assignment.updated';
  end if;

  select role.code, scope.chapter_id
  into assigned_role_code, assigned_chapter_id
  from public.roles as role
  join public.access_scopes as scope on scope.id = assignment.scope_id
  where role.id = assignment.role_id;

  if assigned_role_code = 'super_administrator' then
    insert into public.security_events (
      actor_id,
      subject_user_id,
      chapter_id,
      event_type,
      severity,
      metadata
    )
    values (
      auth.uid(),
      assignment.user_id,
      assigned_chapter_id,
      event_action,
      'high',
      jsonb_build_object(
        'role_id',
        assignment.role_id,
        'scope_id',
        assignment.scope_id
      )
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists b_set_membership_application_workflow_timestamps
  on public.membership_applications;
create trigger b_set_membership_application_workflow_timestamps
  before insert or update on public.membership_applications
  for each row execute procedure public.set_membership_application_workflow_timestamps();

create trigger a_validate_member_document_ownership
  before insert or update on public.member_documents
  for each row execute procedure public.validate_member_document_ownership();
create trigger z_member_documents_updated_at
  before update on public.member_documents
  for each row execute procedure public.set_row_updated_at();

create trigger a_validate_membership_renewal_ownership
  before insert or update on public.membership_renewals
  for each row execute procedure public.validate_membership_renewal_ownership();
create trigger z_membership_renewals_updated_at
  before update on public.membership_renewals
  for each row execute procedure public.set_row_updated_at();

create trigger a_validate_payment_receipt_ownership
  before insert or update on public.payment_receipts
  for each row execute procedure public.validate_payment_receipt_ownership();
create trigger z_payment_receipts_updated_at
  before update on public.payment_receipts
  for each row execute procedure public.set_row_updated_at();

create trigger a_guard_payment_verification_mutation
  before insert or update on public.payment_verifications
  for each row execute procedure public.guard_payment_verification_mutation();
create trigger z_payment_verifications_updated_at
  before update on public.payment_verifications
  for each row execute procedure public.set_row_updated_at();
create trigger z_audit_payment_verification_mutation
  after insert or update or delete on public.payment_verifications
  for each row execute procedure public.audit_payment_verification_mutation();

create trigger z_membership_plans_updated_at
  before update on public.membership_plans
  for each row execute procedure public.set_row_updated_at();
create trigger z_membership_application_steps_updated_at
  before update on public.membership_application_steps
  for each row execute procedure public.set_row_updated_at();
create trigger z_newsletter_subscribers_updated_at
  before update on public.newsletter_subscribers
  for each row execute procedure public.set_row_updated_at();
create trigger z_notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute procedure public.set_row_updated_at();

drop trigger if exists zz_audit_super_administrator_assignment on public.user_roles;
create trigger zz_audit_super_administrator_assignment
  after insert or update or delete on public.user_roles
  for each row execute procedure public.audit_super_administrator_assignment();

-- RLS is enabled explicitly for every new private table. membership_plans is
-- configuration rather than PII but is also protected from untrusted mutation.
alter table public.membership_plans enable row level security;
alter table public.membership_application_steps enable row level security;
alter table public.member_documents enable row level security;
alter table public.membership_renewals enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.payment_verifications enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.security_events enable row level security;

-- Finance used to be allowed to select full applications only to discover the
-- chapter for a payment. That leaked application PII and private document
-- metadata. The replacement policy intentionally excludes payment.review.
drop policy if exists "applications_select_owner_or_reviewer"
  on public.membership_applications;
create policy "applications_select_owner_or_reviewer"
  on public.membership_applications
  for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or public.has_permission('application.review.chapter', chapter_id)
    or public.has_permission('application.review.national', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
  );

-- Owners may see their own payment records. Finance users must use the
-- deliberately minimal public.finance_payment_queue RPC instead of raw rows.
drop policy if exists "payments_select_owner_or_reviewer" on public.payments;
create policy "payments_select_owner"
  on public.payments
  for select
  to authenticated
  using (payer_id = auth.uid());

create policy "membership_plans_select_active_public"
  on public.membership_plans
  for select
  to anon, authenticated
  using (status = 'active' and is_public);

create policy "membership_application_steps_select_owner_or_reviewer"
  on public.membership_application_steps
  for select
  to authenticated
  using (public.can_read_membership_application(application_id));

create policy "membership_renewals_select_self_or_scoped_staff"
  on public.membership_renewals
  for select
  to authenticated
  using (
    public.is_membership_holder(membership_id)
    or public.can_manage_membership(membership_id)
  );

create policy "payment_verifications_select_scoped_finance"
  on public.payment_verifications
  for select
  to authenticated
  using (public.can_review_payment(payment_id));

create policy "notification_preferences_select_recipient"
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "security_events_select_scoped_auditors"
  on public.security_events
  for select
  to authenticated
  using (public.has_permission('audit.read', chapter_id));

-- Preserve and extend the pre-production browser lock. No authenticated or
-- anonymous browser role receives a write policy for application, document,
-- payment, renewal, newsletter, notification-preference, RBAC, or security
-- data. Future server routes must perform validation and audit logging before
-- using the service role.
drop policy if exists "profiles_update_self_or_scoped_staff" on public.profiles;
drop policy if exists "chapters_insert_national_managers" on public.chapters;
drop policy if exists "chapters_update_scoped_managers" on public.chapters;
drop policy if exists "chapters_delete_national_managers" on public.chapters;
drop policy if exists "chapter_assignments_manage_scoped_staff"
  on public.user_chapter_assignments;
drop policy if exists "notifications_update_recipient" on public.notifications;
drop policy if exists "access_scopes_manage_globally" on public.access_scopes;
drop policy if exists "roles_manage_globally" on public.roles;
drop policy if exists "permissions_manage_globally" on public.permissions;
drop policy if exists "role_permissions_manage_globally" on public.role_permissions;
drop policy if exists "user_roles_insert_scope_manager" on public.user_roles;
drop policy if exists "user_roles_update_scope_manager" on public.user_roles;
drop policy if exists "user_roles_delete_scope_manager" on public.user_roles;
drop policy if exists "applications_insert_owner" on public.membership_applications;
drop policy if exists "applications_update_owner_or_reviewer"
  on public.membership_applications;
drop policy if exists "payments_insert_owner" on public.payments;
drop policy if exists "payments_update_owner_or_reviewer" on public.payments;
drop policy if exists "memberships_manage_scoped_staff" on public.memberships;

-- Identity documents and receipts are retrieved only through a future
-- server-authorised signed-URL operation. Browser roles have no raw object
-- policy, including for objects they originally uploaded.
drop policy if exists "private_objects_insert_owner_folder" on storage.objects;
drop policy if exists "private_objects_select_owner_folder" on storage.objects;
drop policy if exists "private_objects_update_owner_folder" on storage.objects;
drop policy if exists "private_objects_delete_owner_folder" on storage.objects;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'membership-documents',
  'membership-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke select, insert, update, delete on storage.objects from anon, authenticated;
alter default privileges in schema public
  revoke insert, update, delete on tables from anon, authenticated;

revoke all on function public.can_read_membership_application(uuid) from public;
revoke all on function public.can_review_payment(uuid) from public;
revoke all on function public.is_membership_holder(uuid) from public;
revoke all on function public.can_manage_membership(uuid) from public;
revoke all on function public.can_access_payment(uuid) from public;
revoke all on function public.finance_payment_queue(public.payment_status, integer)
  from public;

grant execute on function public.can_read_membership_application(uuid)
  to authenticated, service_role;
grant execute on function public.can_review_payment(uuid)
  to authenticated, service_role;
grant execute on function public.is_membership_holder(uuid)
  to authenticated, service_role;
grant execute on function public.can_manage_membership(uuid)
  to authenticated, service_role;
grant execute on function public.can_access_payment(uuid)
  to authenticated, service_role;
grant execute on function public.finance_payment_queue(public.payment_status, integer)
  to authenticated, service_role;

commit;
