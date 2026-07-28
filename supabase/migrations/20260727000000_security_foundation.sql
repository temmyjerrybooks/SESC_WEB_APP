-- SESC security foundation
-- This migration is intentionally credential-free. Apply it with the Supabase CLI
-- or Dashboard before enabling application access.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.scope_kind as enum ('global', 'national', 'chapter');
create type public.chapter_kind as enum ('state', 'international');
create type public.chapter_status as enum ('active', 'inactive', 'archived');
create type public.account_status as enum ('active', 'suspended', 'deactivated');
create type public.application_status as enum (
  'draft',
  'submitted',
  'under_review',
  'requires_correction',
  'approved',
  'rejected',
  'withdrawn'
);
create type public.payment_method as enum ('manual_bank_transfer', 'paystack');
create type public.payment_status as enum (
  'pending_receipt',
  'pending_verification',
  'approved',
  'rejected',
  'needs_resubmission',
  'cancelled',
  'refunded'
);
create type public.membership_status as enum (
  'pending_activation',
  'active',
  'expired',
  'suspended',
  'cancelled',
  'revoked'
);
create type public.chapter_assignment_kind as enum ('member', 'officer', 'delegate', 'staff');
create type public.notification_category as enum (
  'account',
  'application',
  'payment',
  'membership',
  'chapter',
  'system'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext unique,
  given_name text,
  family_name text,
  display_name text,
  phone text,
  country_code char(2),
  avatar_path text,
  home_chapter_id uuid,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_display_name_length check (
    display_name is null or char_length(trim(display_name)) between 1 and 120
  ),
  constraint profiles_given_name_length check (
    given_name is null or char_length(trim(given_name)) between 1 and 80
  ),
  constraint profiles_family_name_length check (
    family_name is null or char_length(trim(family_name)) between 1 and 80
  ),
  constraint profiles_country_code_format check (
    country_code is null or country_code ~ '^[A-Z]{2}$'
  )
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind public.chapter_kind not null,
  state_or_region text,
  country_code char(2) not null default 'NG',
  city text,
  public_contact_email citext,
  public_contact_phone text,
  status public.chapter_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chapters_name_length check (char_length(trim(name)) between 2 and 160),
  constraint chapters_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint chapters_country_code_format check (country_code ~ '^[A-Z]{2}$')
);

alter table public.profiles
  add constraint profiles_home_chapter_id_fkey
  foreign key (home_chapter_id)
  references public.chapters (id)
  on delete set null;

create table public.access_scopes (
  id uuid primary key default gen_random_uuid(),
  kind public.scope_kind not null,
  chapter_id uuid references public.chapters (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint access_scopes_shape check (
    (kind = 'chapter' and chapter_id is not null)
    or (kind in ('global', 'national') and chapter_id is null)
  )
);

create unique index access_scopes_single_global_idx
  on public.access_scopes (kind)
  where kind = 'global';
create unique index access_scopes_single_national_idx
  on public.access_scopes (kind)
  where kind = 'national';
create unique index access_scopes_single_chapter_idx
  on public.access_scopes (chapter_id)
  where kind = 'chapter';

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  allowed_scope_kinds public.scope_kind[] not null,
  privilege_rank smallint not null default 10,
  is_system boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint roles_code_format check (code ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  constraint roles_scope_kinds_not_empty check (cardinality(allowed_scope_kinds) > 0),
  constraint roles_privilege_rank_check check (privilege_rank between 0 and 100)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint permissions_code_format check (
    code ~ '^[a-z0-9]+(?:[._][a-z0-9]+)*$'
  )
);

create table public.role_permissions (
  role_id uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (role_id, permission_id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  scope_id uuid not null references public.access_scopes (id) on delete restrict,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_roles_expiration_after_grant check (
    expires_at is null or expires_at > granted_at
  )
);

create unique index user_roles_active_unique_idx
  on public.user_roles (user_id, role_id, scope_id)
  where revoked_at is null;
create index user_roles_user_active_idx
  on public.user_roles (user_id, expires_at)
  where revoked_at is null;
create index user_roles_scope_active_idx
  on public.user_roles (scope_id, expires_at)
  where revoked_at is null;

create table public.user_chapter_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  assignment_kind public.chapter_assignment_kind not null default 'member',
  title text,
  is_primary boolean not null default false,
  starts_on date not null default current_date,
  ends_on date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_chapter_assignments_dates check (
    ends_on is null or ends_on >= starts_on
  )
);

create unique index user_chapter_assignments_active_unique_idx
  on public.user_chapter_assignments (user_id, chapter_id, assignment_kind)
  where ends_on is null;
create unique index user_chapter_assignments_primary_unique_idx
  on public.user_chapter_assignments (user_id)
  where is_primary and ends_on is null;
create index user_chapter_assignments_chapter_active_idx
  on public.user_chapter_assignments (chapter_id)
  where ends_on is null;

create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  application_number bigint generated always as identity unique,
  reference_code text generated always as (
    'SESC-' || lpad(application_number::text, 8, '0')
  ) stored unique,
  applicant_id uuid not null references public.profiles (id) on delete restrict,
  chapter_id uuid not null references public.chapters (id) on delete restrict,
  category_code text not null default 'standard',
  current_step smallint not null default 1,
  status public.application_status not null default 'draft',
  first_name text,
  last_name text,
  date_of_birth date,
  phone text,
  residence_country char(2),
  address_line_1 text,
  address_line_2 text,
  city text,
  state_or_region text,
  postal_code text,
  emergency_contact jsonb not null default '{}'::jsonb,
  profile_photo_path text,
  identity_document_path text,
  declaration_accepted_at timestamptz,
  privacy_consent_at timestamptz,
  submitted_at timestamptz,
  withdrawn_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint membership_applications_step_range check (current_step between 1 and 11),
  constraint membership_applications_category_length check (
    char_length(trim(category_code)) between 2 and 60
  ),
  constraint membership_applications_residence_country_format check (
    residence_country is null or residence_country ~ '^[A-Z]{2}$'
  ),
  constraint membership_applications_emergency_contact_object check (
    jsonb_typeof(emergency_contact) = 'object'
  )
);

create unique index membership_applications_one_open_per_user_idx
  on public.membership_applications (applicant_id)
  where status in ('draft', 'submitted', 'under_review', 'requires_correction');
create index membership_applications_chapter_status_idx
  on public.membership_applications (chapter_id, status, created_at desc);
create index membership_applications_applicant_idx
  on public.membership_applications (applicant_id, created_at desc);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number bigint generated always as identity unique,
  reference_code text generated always as (
    'PAY-' || lpad(payment_number::text, 10, '0')
  ) stored unique,
  application_id uuid not null references public.membership_applications (id) on delete restrict,
  payer_id uuid not null references public.profiles (id) on delete restrict,
  method public.payment_method not null default 'manual_bank_transfer',
  status public.payment_status not null default 'pending_receipt',
  amount_minor integer not null,
  currency char(3) not null default 'NGN',
  bank_reference text,
  provider_reference text,
  receipt_path text,
  submitted_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  verification_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint payments_amount_nonnegative check (amount_minor >= 0),
  constraint payments_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint payments_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint payments_manual_receipt_required check (
    method <> 'manual_bank_transfer'
    or status in ('pending_receipt', 'cancelled')
    or receipt_path is not null
  ),
  constraint payments_review_details_required check (
    status not in ('approved', 'rejected', 'needs_resubmission')
    or (verified_by is not null and verified_at is not null)
  )
);

create index payments_application_status_idx
  on public.payments (application_id, status, created_at desc);
create index payments_payer_idx
  on public.payments (payer_id, created_at desc);
create index payments_pending_review_idx
  on public.payments (status, created_at asc)
  where status in ('pending_verification', 'needs_resubmission');

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  membership_number bigint generated always as identity unique,
  card_number text generated always as (
    'SESC-M-' || lpad(membership_number::text, 8, '0')
  ) stored unique,
  application_id uuid not null unique references public.membership_applications (id) on delete restrict,
  member_id uuid not null references public.profiles (id) on delete restrict,
  chapter_id uuid not null references public.chapters (id) on delete restrict,
  category_code text not null,
  status public.membership_status not null default 'pending_activation',
  issue_date date not null default current_date,
  expires_on date not null default (current_date + 365),
  activated_at timestamptz,
  activated_by uuid references public.profiles (id) on delete set null,
  activation_payment_id uuid references public.payments (id) on delete restrict,
  suspended_at timestamptz,
  suspension_reason text,
  verification_token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint memberships_category_length check (
    char_length(trim(category_code)) between 2 and 60
  ),
  constraint memberships_expiry_after_issue check (expires_on >= issue_date),
  constraint memberships_active_details_required check (
    status <> 'active'
    or (activated_at is not null and activation_payment_id is not null)
  )
);

create index memberships_member_status_idx
  on public.memberships (member_id, status, expires_on desc);
create index memberships_chapter_status_idx
  on public.memberships (chapter_id, status, expires_on);
create index memberships_expiry_idx
  on public.memberships (expires_on)
  where status = 'active';

create table public.audit_log (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_id uuid references public.profiles (id) on delete set null,
  subject_user_id uuid references public.profiles (id) on delete set null,
  chapter_id uuid references public.chapters (id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  request_id uuid,
  ip_hash text,
  constraint audit_log_entity_type_length check (
    char_length(trim(entity_type)) between 2 and 80
  ),
  constraint audit_log_action_length check (
    char_length(trim(action)) between 2 and 120
  ),
  constraint audit_log_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_log_occurred_at_idx on public.audit_log (occurred_at desc);
create index audit_log_actor_idx on public.audit_log (actor_id, occurred_at desc);
create index audit_log_chapter_idx on public.audit_log (chapter_id, occurred_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id, occurred_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category public.notification_category not null default 'system',
  title text not null,
  body text not null,
  action_url text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint notifications_title_length check (char_length(trim(title)) between 1 and 160),
  constraint notifications_body_length check (char_length(trim(body)) between 1 and 2000),
  constraint notifications_data_object check (jsonb_typeof(data) = 'object')
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_expiry_idx
  on public.notifications (expires_at)
  where expires_at is not null;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(
      left(
        trim(
          coalesce(
            new.raw_user_meta_data ->> 'display_name',
            new.raw_user_meta_data ->> 'full_name',
            ''
          )
        ),
        120
      ),
      ''
    )
  )
  on conflict (id) do update
  set email = excluded.email;

  -- Mark the following base-role insert as an Auth bootstrap operation. This
  -- prevents an Auth request context from being mistaken for self-escalation.
  perform set_config('app.bootstrap_user_role', 'true', true);

  insert into public.user_roles (user_id, role_id, scope_id)
  select new.id, roles.id, scopes.id
  from public.roles as roles
  cross join public.access_scopes as scopes
  where roles.code = 'visitor'
    and scopes.kind = 'global'
  on conflict do nothing;

  return new;
end;
$$;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = new.email
    where id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.create_chapter_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.access_scopes (kind, chapter_id, label)
  values ('chapter', new.id, new.name)
  on conflict do nothing;
  return new;
end;
$$;

create or replace function public.has_permission(
  required_permission text,
  resource_chapter_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    join public.role_permissions as role_permission
      on role_permission.role_id = user_role.role_id
    join public.permissions as permission
      on permission.id = role_permission.permission_id
    join public.access_scopes as scope
      on scope.id = user_role.scope_id
    where user_role.user_id = auth.uid()
      and user_role.revoked_at is null
      and (user_role.expires_at is null or user_role.expires_at > timezone('utc', now()))
      and permission.code = required_permission
      and (
        scope.kind in ('global', 'national')
        or (
          scope.kind = 'chapter'
          and resource_chapter_id is not null
          and scope.chapter_id = resource_chapter_id
        )
      )
  );
$$;

create or replace function public.current_user_has_scope(requested_scope_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and scope_id = requested_scope_id
      and revoked_at is null
      and (expires_at is null or expires_at > timezone('utc', now()))
  );
$$;

create or replace function public.can_manage_scope(requested_scope_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when scope.kind = 'chapter'
          then public.has_permission('role.assign', scope.chapter_id)
        else public.has_permission('role.assign', null)
      end
      from public.access_scopes as scope
      where scope.id = requested_scope_id
    ),
    false
  );
$$;

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
    join public.membership_applications as application
      on application.id = payment.application_id
    where payment.id = requested_payment_id
      and (
        payment.payer_id = auth.uid()
        or public.has_permission('payment.review', application.chapter_id)
      )
  );
$$;

create or replace function public.validate_user_role_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_scope_kinds public.scope_kind[];
  assigned_scope_kind public.scope_kind;
begin
  select role.allowed_scope_kinds, scope.kind
  into role_scope_kinds, assigned_scope_kind
  from public.roles as role
  join public.access_scopes as scope on scope.id = new.scope_id
  where role.id = new.role_id;

  if role_scope_kinds is null or assigned_scope_kind is null then
    raise exception 'Role or scope does not exist';
  end if;

  if not (assigned_scope_kind = any (role_scope_kinds)) then
    raise exception 'Role cannot be granted at this scope';
  end if;

  return new;
end;
$$;

create or replace function public.guard_user_role_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_rank smallint;
  target_rank smallint;
  target_user_id uuid;
  target_role_id uuid;
  target_scope_id uuid;
begin
  if tg_op = 'DELETE' then
    target_user_id := old.user_id;
    target_role_id := old.role_id;
    target_scope_id := old.scope_id;
  else
    target_user_id := new.user_id;
    target_role_id := new.role_id;
    target_scope_id := new.scope_id;
  end if;

  if actor_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT'
    and current_setting('app.bootstrap_user_role', true) = 'true' then
    return new;
  end if;

  if not public.can_manage_scope(target_scope_id) then
    raise exception 'Not authorised to manage role assignments';
  end if;

  if target_user_id = actor_id then
    raise exception 'Users cannot change their own role assignments';
  end if;

  select max(role.privilege_rank)
  into actor_rank
  from public.user_roles as user_role
  join public.roles as role on role.id = user_role.role_id
  where user_role.user_id = actor_id
    and user_role.revoked_at is null
    and (user_role.expires_at is null or user_role.expires_at > timezone('utc', now()));

  select privilege_rank
  into target_rank
  from public.roles
  where id = target_role_id;

  if actor_rank is null or target_rank is null or actor_rank <= target_rank then
    raise exception 'A role may only be assigned by a higher-privileged user';
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
      or new.role_id is distinct from old.role_id
      or new.scope_id is distinct from old.scope_id
      or new.granted_by is distinct from old.granted_by
      or new.granted_at is distinct from old.granted_at then
      raise exception 'Role identity and grant origin are immutable';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.granted_by := actor_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  -- Auth email synchronization is invoked from an auth.users trigger.
  -- It is the only trusted nested update that may change profile.email.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if actor_id is null then
    return new;
  end if;

  if actor_id = old.id then
    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.home_chapter_id is distinct from old.home_chapter_id
      or new.account_status is distinct from old.account_status
      or new.created_at is distinct from old.created_at then
      raise exception 'This profile field is managed by the platform';
    end if;
    return new;
  end if;

  if not public.has_permission('member.profile.manage', old.home_chapter_id) then
    raise exception 'Not authorised to update this profile';
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
      if new.reviewed_by is not null or new.reviewed_at is not null or new.review_notes is not null then
        raise exception 'Applicants cannot set review fields';
      end if;
    end if;

    if new.status = 'submitted' and new.submitted_at is null then
      new.submitted_at := timezone('utc', now());
    end if;
    return new;
  end if;

  if actor_id is null then
    return new;
  end if;

  if actor_id = old.applicant_id then
    if new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_notes is distinct from old.review_notes
      or new.applicant_id is distinct from old.applicant_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Applicants cannot modify review or ownership fields';
    end if;

    if (old.status = 'draft' and new.status not in ('draft', 'submitted', 'withdrawn'))
      or (old.status = 'requires_correction' and new.status not in ('requires_correction', 'submitted', 'withdrawn'))
      or (old.status = 'submitted' and new.status <> 'withdrawn')
      or (old.status not in ('draft', 'requires_correction', 'submitted')) then
      raise exception 'This application cannot be changed at its current status';
    end if;

    if new.status = 'submitted' and old.status <> 'submitted' and new.submitted_at is null then
      new.submitted_at := timezone('utc', now());
    end if;
    if new.status = 'withdrawn' and old.status <> 'withdrawn' and new.withdrawn_at is null then
      new.withdrawn_at := timezone('utc', now());
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
    or new.created_at is distinct from old.created_at then
    raise exception 'Application ownership is immutable';
  end if;

  if new.status in ('under_review', 'requires_correction', 'approved', 'rejected') then
    new.reviewed_by := actor_id;
    new.reviewed_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.guard_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  application_owner_id uuid;
  application_chapter_id uuid;
  requested_application_id uuid;
begin
  if tg_op = 'DELETE' then
    requested_application_id := old.application_id;
  else
    requested_application_id := new.application_id;
  end if;

  select application.applicant_id, application.chapter_id
  into application_owner_id, application_chapter_id
  from public.membership_applications as application
  where application.id = requested_application_id;

  if application_owner_id is null then
    raise exception 'Payment application does not exist';
  end if;

  if tg_op <> 'DELETE' and new.payer_id <> application_owner_id then
    raise exception 'Payment payer must match the application owner';
  end if;

  if actor_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not public.has_permission('payment.review', application_chapter_id) then
      raise exception 'Not authorised to delete this payment';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.payer_id <> actor_id then
      raise exception 'Payments may only be created by the payer';
    end if;
    if new.status not in ('pending_receipt', 'pending_verification') then
      raise exception 'Payers cannot set a reviewed payment status';
    end if;
    if new.status = 'pending_verification' and new.submitted_at is null then
      new.submitted_at := timezone('utc', now());
    end if;
    return new;
  end if;

  if actor_id = old.payer_id then
    if new.application_id is distinct from old.application_id
      or new.payer_id is distinct from old.payer_id
      or new.method is distinct from old.method
      or new.amount_minor is distinct from old.amount_minor
      or new.currency is distinct from old.currency
      or new.verified_by is distinct from old.verified_by
      or new.verified_at is distinct from old.verified_at
      or new.verification_notes is distinct from old.verification_notes
      or new.created_at is distinct from old.created_at then
      raise exception 'Payment ownership, value, and review fields are immutable';
    end if;

    if (old.status = 'pending_receipt' and new.status not in ('pending_receipt', 'pending_verification', 'cancelled'))
      or (old.status = 'needs_resubmission' and new.status not in ('pending_verification', 'cancelled'))
      or (old.status not in ('pending_receipt', 'needs_resubmission') and new.status <> old.status) then
      raise exception 'This payment cannot be changed at its current status';
    end if;

    if new.status = 'pending_verification' and old.status <> 'pending_verification' and new.submitted_at is null then
      new.submitted_at := timezone('utc', now());
    end if;
    return new;
  end if;

  if not public.has_permission('payment.review', application_chapter_id) then
    raise exception 'Not authorised to review this payment';
  end if;

  if new.application_id is distinct from old.application_id
    or new.payer_id is distinct from old.payer_id
    or new.method is distinct from old.method
    or new.amount_minor is distinct from old.amount_minor
    or new.currency is distinct from old.currency
    or new.created_at is distinct from old.created_at then
    raise exception 'Payment identity and value are immutable';
  end if;

  if new.status not in ('approved', 'rejected', 'needs_resubmission', 'pending_verification') then
    raise exception 'Reviewers must use a payment review status';
  end if;

  if new.status in ('approved', 'rejected', 'needs_resubmission') then
    new.verified_by := actor_id;
    new.verified_at := timezone('utc', now());
  end if;

  return new;
end;
$$;

create or replace function public.guard_membership_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  application_owner_id uuid;
  application_chapter_id uuid;
  application_state public.application_status;
  approved_payment_exists boolean;
  requested_application_id uuid;
  requested_chapter_id uuid;
begin
  if tg_op = 'DELETE' then
    requested_application_id := old.application_id;
    requested_chapter_id := old.chapter_id;
  else
    requested_application_id := new.application_id;
    requested_chapter_id := new.chapter_id;
  end if;

  select application.applicant_id, application.chapter_id, application.status
  into application_owner_id, application_chapter_id, application_state
  from public.membership_applications as application
  where application.id = requested_application_id;

  if application_owner_id is null then
    raise exception 'Membership application does not exist';
  end if;

  if tg_op <> 'DELETE' then
    if new.member_id <> application_owner_id
      or new.chapter_id <> application_chapter_id then
      raise exception 'Membership member and chapter must match the approved application';
    end if;

    if application_state <> 'approved' then
      raise exception 'Memberships can only be issued from approved applications';
    end if;
  end if;

  if actor_id is not null and not public.has_permission(
    'membership.manage',
    requested_chapter_id
  ) then
    raise exception 'Not authorised to manage memberships';
  end if;

  if tg_op <> 'DELETE' and new.status = 'active' then
    if new.activation_payment_id is null then
      raise exception 'An active membership requires an approved payment';
    end if;

    select exists (
      select 1
      from public.payments as payment
      where payment.id = new.activation_payment_id
        and payment.application_id = new.application_id
        and payment.status = 'approved'
    )
    into approved_payment_exists;

    if not approved_payment_exists then
      raise exception 'Membership activation payment is not approved for this application';
    end if;

    if new.activated_at is null then
      new.activated_at := timezone('utc', now());
    end if;
    if new.activated_by is null and actor_id is not null then
      new.activated_by := actor_id;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    return new;
  end if;

  if actor_id <> old.user_id then
    raise exception 'Notifications may only be marked by their recipient';
  end if;

  if new.user_id is distinct from old.user_id
    or new.category is distinct from old.category
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.action_url is distinct from old.action_url
    or new.data is distinct from old.data
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Only notification read state may be changed';
  end if;

  return new;
end;
$$;

create or replace function public.audit_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_assignment public.user_roles;
  scope_chapter_id uuid;
  audit_action text;
begin
  if tg_op = 'DELETE' then
    role_assignment := old;
    audit_action := 'role.assignment.deleted';
  elsif tg_op = 'INSERT' then
    role_assignment := new;
    audit_action := 'role.assignment.created';
  else
    role_assignment := new;
    audit_action := case
      when old.revoked_at is null and new.revoked_at is not null then 'role.assignment.revoked'
      else 'role.assignment.updated'
    end;
  end if;

  select chapter_id
  into scope_chapter_id
  from public.access_scopes
  where id = role_assignment.scope_id;

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
    role_assignment.user_id,
    scope_chapter_id,
    'user_role',
    role_assignment.id,
    audit_action,
    jsonb_build_object(
      'role_id', role_assignment.role_id,
      'scope_id', role_assignment.scope_id
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.audit_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
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
      new.applicant_id,
      new.chapter_id,
      'membership_application',
      new.id,
      'application.status.changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  application_chapter_id uuid;
begin
  if old.status is distinct from new.status then
    select chapter_id
    into application_chapter_id
    from public.membership_applications
    where id = new.application_id;

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
      new.payer_id,
      application_chapter_id,
      'payment',
      new.id,
      'payment.status.changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create or replace function public.audit_membership_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
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
      new.member_id,
      new.chapter_id,
      'membership',
      new.id,
      'membership.status.changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

insert into public.access_scopes (kind, label)
values
  ('global', 'Global platform scope'),
  ('national', 'National SESC scope');

insert into public.roles (
  code,
  name,
  description,
  allowed_scope_kinds,
  privilege_rank
)
values
  ('visitor', 'Visitor', 'Authenticated base account.', array['global']::public.scope_kind[], 0),
  ('applicant', 'Applicant', 'Membership applicant with an in-progress or submitted application.', array['global']::public.scope_kind[], 5),
  ('member', 'Member', 'Active or historical SESC member.', array['global']::public.scope_kind[], 10),
  ('chapter_executive', 'Chapter Executive', 'Chapter operations officer.', array['chapter']::public.scope_kind[], 30),
  ('chapter_chairman', 'Chapter Chairman', 'Chapter leadership and management officer.', array['chapter']::public.scope_kind[], 40),
  ('state_coordinator', 'State Coordinator', 'State-level chapter coordinator.', array['chapter']::public.scope_kind[], 45),
  ('international_chapter_coordinator', 'International Chapter Coordinator', 'International chapter coordinator.', array['chapter']::public.scope_kind[], 45),
  ('national_executive', 'National Executive', 'National SESC executive.', array['national']::public.scope_kind[], 60),
  ('content_editor', 'Content Editor', 'Authorised content publisher.', array['national', 'chapter']::public.scope_kind[], 35),
  ('events_officer', 'Events Officer', 'Authorised events manager.', array['national', 'chapter']::public.scope_kind[], 35),
  ('membership_officer', 'Membership Officer', 'Authorised membership reviewer and issuer.', array['national', 'chapter']::public.scope_kind[], 55),
  ('finance_officer', 'Finance Officer', 'Authorised payment reviewer.', array['national', 'chapter']::public.scope_kind[], 55),
  ('sponsorship_officer', 'Sponsorship Officer', 'Authorised sponsor manager.', array['national']::public.scope_kind[], 45),
  ('awards_committee_member', 'Awards Committee Member', 'Authorised awards manager.', array['national']::public.scope_kind[], 40),
  ('support_officer', 'Support Officer', 'Authorised member support officer.', array['national', 'chapter']::public.scope_kind[], 30),
  ('auditor', 'Auditor', 'Read-only audit reviewer.', array['national']::public.scope_kind[], 65),
  ('super_administrator', 'Super Administrator', 'Platform owner with global administrative authority.', array['global']::public.scope_kind[], 100);

insert into public.permissions (code, name, description)
values
  ('member.profile.read.self', 'Read own profile', 'Read the signed-in profile.'),
  ('member.profile.update.self', 'Update own profile', 'Update safe self-service profile fields.'),
  ('member.profile.read.scoped', 'Read scoped profiles', 'Read member profiles within an authorised scope.'),
  ('member.profile.manage', 'Manage scoped profiles', 'Manage member profiles within an authorised scope.'),
  ('application.create', 'Create application', 'Create a membership application.'),
  ('application.read.self', 'Read own applications', 'Read applications submitted by the current user.'),
  ('application.update.self', 'Update own applications', 'Update eligible applications submitted by the current user.'),
  ('application.review.chapter', 'Review chapter applications', 'Review applications in an assigned chapter.'),
  ('application.review.national', 'Review national applications', 'Review applications across the national scope.'),
  ('payment.create', 'Create payment', 'Create a payment record for an owned application.'),
  ('payment.read.self', 'Read own payments', 'Read payments made by the current user.'),
  ('payment.submit_receipt', 'Submit payment receipt', 'Submit or replace a receipt while payment remediation is allowed.'),
  ('payment.review', 'Review payments', 'Verify manual payment records within an authorised scope.'),
  ('membership.read.self', 'Read own memberships', 'Read memberships held by the current user.'),
  ('membership.read.scoped', 'Read scoped memberships', 'Read memberships within an authorised scope.'),
  ('membership.manage', 'Manage memberships', 'Issue, activate, suspend, and renew memberships within an authorised scope.'),
  ('chapter.manage', 'Manage chapters', 'Manage assigned chapter records.'),
  ('content.publish', 'Publish content', 'Publish approved club content.'),
  ('event.manage', 'Manage events', 'Manage club events.'),
  ('sponsor.manage', 'Manage sponsors', 'Manage sponsorship records.'),
  ('award.manage', 'Manage awards', 'Manage awards and gala records.'),
  ('notification.read.self', 'Read own notifications', 'Read notifications addressed to the current user.'),
  ('notification.manage.self', 'Manage own notifications', 'Mark notifications addressed to the current user as read or unread.'),
  ('notification.send', 'Send notifications', 'Create in-app notifications.'),
  ('role.assign', 'Assign roles', 'Manage scoped role assignments.'),
  ('audit.read', 'Read audit log', 'Read security and operational audit records.'),
  ('settings.manage', 'Manage platform settings', 'Manage platform-level settings.');

with grants(role_code, permission_code) as (
  values
    ('applicant', 'member.profile.read.self'),
    ('applicant', 'member.profile.update.self'),
    ('applicant', 'application.create'),
    ('applicant', 'application.read.self'),
    ('applicant', 'application.update.self'),
    ('applicant', 'payment.create'),
    ('applicant', 'payment.read.self'),
    ('applicant', 'payment.submit_receipt'),
    ('applicant', 'notification.read.self'),
    ('applicant', 'notification.manage.self'),
    ('member', 'member.profile.read.self'),
    ('member', 'member.profile.update.self'),
    ('member', 'application.create'),
    ('member', 'application.read.self'),
    ('member', 'application.update.self'),
    ('member', 'payment.create'),
    ('member', 'payment.read.self'),
    ('member', 'payment.submit_receipt'),
    ('member', 'membership.read.self'),
    ('member', 'notification.read.self'),
    ('member', 'notification.manage.self'),
    ('chapter_executive', 'member.profile.read.scoped'),
    ('chapter_executive', 'application.review.chapter'),
    ('chapter_executive', 'membership.read.scoped'),
    ('chapter_chairman', 'member.profile.read.scoped'),
    ('chapter_chairman', 'member.profile.manage'),
    ('chapter_chairman', 'application.review.chapter'),
    ('chapter_chairman', 'membership.read.scoped'),
    ('chapter_chairman', 'chapter.manage'),
    ('state_coordinator', 'member.profile.read.scoped'),
    ('state_coordinator', 'member.profile.manage'),
    ('state_coordinator', 'application.review.chapter'),
    ('state_coordinator', 'membership.read.scoped'),
    ('state_coordinator', 'membership.manage'),
    ('state_coordinator', 'chapter.manage'),
    ('international_chapter_coordinator', 'member.profile.read.scoped'),
    ('international_chapter_coordinator', 'member.profile.manage'),
    ('international_chapter_coordinator', 'application.review.chapter'),
    ('international_chapter_coordinator', 'membership.read.scoped'),
    ('international_chapter_coordinator', 'membership.manage'),
    ('international_chapter_coordinator', 'chapter.manage'),
    ('national_executive', 'member.profile.read.scoped'),
    ('national_executive', 'application.review.national'),
    ('national_executive', 'membership.read.scoped'),
    ('national_executive', 'chapter.manage'),
    ('national_executive', 'notification.send'),
    ('content_editor', 'content.publish'),
    ('events_officer', 'event.manage'),
    ('membership_officer', 'member.profile.read.scoped'),
    ('membership_officer', 'member.profile.manage'),
    ('membership_officer', 'application.review.chapter'),
    ('membership_officer', 'application.review.national'),
    ('membership_officer', 'membership.read.scoped'),
    ('membership_officer', 'membership.manage'),
    ('finance_officer', 'payment.review'),
    ('sponsorship_officer', 'sponsor.manage'),
    ('awards_committee_member', 'award.manage'),
    ('support_officer', 'member.profile.read.scoped'),
    ('support_officer', 'membership.read.scoped'),
    ('auditor', 'audit.read')
)
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from grants
join public.roles as role on role.code = grants.role_code
join public.permissions as permission on permission.code = grants.permission_code;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
cross join public.permissions as permission
where role.code = 'super_administrator';

-- Backfill accounts that existed before this migration, then grant their base role.
insert into public.profiles (id, email, display_name)
select
  auth_user.id,
  auth_user.email,
  nullif(
    left(
      trim(
        coalesce(
          auth_user.raw_user_meta_data ->> 'display_name',
          auth_user.raw_user_meta_data ->> 'full_name',
          ''
        )
      ),
      120
    ),
    ''
  )
from auth.users as auth_user
on conflict (id) do update
set email = excluded.email;

insert into public.user_roles (user_id, role_id, scope_id)
select profile.id, role.id, scope.id
from public.profiles as profile
cross join public.roles as role
cross join public.access_scopes as scope
where role.code = 'visitor'
  and scope.kind = 'global'
on conflict do nothing;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.sync_profile_email();

create trigger on_chapter_created
  after insert on public.chapters
  for each row execute procedure public.create_chapter_scope();

create trigger a_validate_user_role_scope
  before insert or update on public.user_roles
  for each row execute procedure public.validate_user_role_scope();
create trigger b_guard_user_role_mutation
  before insert or update or delete on public.user_roles
  for each row execute procedure public.guard_user_role_mutation();
create trigger z_audit_user_role_change
  after insert or update or delete on public.user_roles
  for each row execute procedure public.audit_user_role_change();

create trigger a_guard_profile_update
  before update on public.profiles
  for each row execute procedure public.guard_profile_update();
create trigger z_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_row_updated_at();
create trigger z_chapters_updated_at
  before update on public.chapters
  for each row execute procedure public.set_row_updated_at();
create trigger z_roles_updated_at
  before update on public.roles
  for each row execute procedure public.set_row_updated_at();
create trigger z_permissions_updated_at
  before update on public.permissions
  for each row execute procedure public.set_row_updated_at();
create trigger z_user_roles_updated_at
  before update on public.user_roles
  for each row execute procedure public.set_row_updated_at();
create trigger z_user_chapter_assignments_updated_at
  before update on public.user_chapter_assignments
  for each row execute procedure public.set_row_updated_at();

create trigger a_guard_membership_application_mutation
  before insert or update on public.membership_applications
  for each row execute procedure public.guard_membership_application_mutation();
create trigger z_membership_applications_updated_at
  before update on public.membership_applications
  for each row execute procedure public.set_row_updated_at();
create trigger z_audit_application_status_change
  after update on public.membership_applications
  for each row execute procedure public.audit_application_status_change();

create trigger a_guard_payment_mutation
  before insert or update or delete on public.payments
  for each row execute procedure public.guard_payment_mutation();
create trigger z_payments_updated_at
  before update on public.payments
  for each row execute procedure public.set_row_updated_at();
create trigger z_audit_payment_status_change
  after update on public.payments
  for each row execute procedure public.audit_payment_status_change();

create trigger a_guard_membership_mutation
  before insert or update or delete on public.memberships
  for each row execute procedure public.guard_membership_mutation();
create trigger z_memberships_updated_at
  before update on public.memberships
  for each row execute procedure public.set_row_updated_at();
create trigger z_audit_membership_status_change
  after update on public.memberships
  for each row execute procedure public.audit_membership_status_change();

create trigger a_guard_notification_update
  before update on public.notifications
  for each row execute procedure public.guard_notification_update();

create or replace function public.verify_membership_card(requested_token uuid)
returns table (
  is_valid boolean,
  member_name text,
  membership_number text,
  membership_category text,
  chapter_name text,
  expires_on date
)
language sql
stable
security definer
set search_path = public
as $$
  select
    membership.status = 'active' and membership.expires_on >= current_date as is_valid,
    case
      when membership.status = 'active' and membership.expires_on >= current_date
        then coalesce(
          nullif(profile.display_name, ''),
          nullif(trim(concat_ws(' ', profile.given_name, profile.family_name)), '')
        )
    end as member_name,
    case
      when membership.status = 'active' and membership.expires_on >= current_date
        then membership.card_number
    end as membership_number,
    case
      when membership.status = 'active' and membership.expires_on >= current_date
        then membership.category_code
    end as membership_category,
    case
      when membership.status = 'active' and membership.expires_on >= current_date
        then chapter.name
    end as chapter_name,
    case
      when membership.status = 'active' and membership.expires_on >= current_date
        then membership.expires_on
    end as expires_on
  from public.memberships as membership
  join public.profiles as profile on profile.id = membership.member_id
  join public.chapters as chapter on chapter.id = membership.chapter_id
  where membership.verification_token = requested_token;
$$;

revoke all on function public.has_permission(text, uuid) from public;
revoke all on function public.current_user_has_scope(uuid) from public;
revoke all on function public.can_manage_scope(uuid) from public;
revoke all on function public.can_access_payment(uuid) from public;
revoke all on function public.verify_membership_card(uuid) from public;

grant execute on function public.has_permission(text, uuid) to authenticated, service_role;
grant execute on function public.current_user_has_scope(uuid) to authenticated, service_role;
grant execute on function public.can_manage_scope(uuid) to authenticated, service_role;
grant execute on function public.can_access_payment(uuid) to authenticated, service_role;
grant execute on function public.verify_membership_card(uuid) to anon, authenticated, service_role;

commit;
