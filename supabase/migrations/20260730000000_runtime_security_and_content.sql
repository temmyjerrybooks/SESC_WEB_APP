-- Runtime security, public-workflow records, and managed-content foundation.
--
-- All browser mutations remain denied. The RPCs introduced by the following
-- migration are invoked only after server-side session verification.

begin;

create type public.content_entry_kind as enum (
  'announcement',
  'news',
  'event',
  'gallery_album',
  'gallery_media',
  'sponsor',
  'partner',
  'page'
);

create type public.content_entry_status as enum ('draft', 'published', 'archived');
create type public.contact_enquiry_status as enum ('new', 'in_progress', 'resolved', 'closed');

create table public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  reference_code text generated always as (
    'SESC-C-' || upper(substr(replace(id::text, '-', ''), 1, 10))
  ) stored unique,
  name text not null,
  email citext not null,
  subject text not null,
  message text not null,
  consented_at timestamptz not null default timezone('utc', now()),
  source_page text,
  status public.contact_enquiry_status not null default 'new',
  assigned_to uuid references public.profiles (id) on delete set null,
  resolution_notes text,
  ip_hash char(64),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint contact_enquiries_name_length check (char_length(trim(name)) between 2 and 160),
  constraint contact_enquiries_subject_length check (char_length(trim(subject)) between 2 and 180),
  constraint contact_enquiries_message_length check (char_length(trim(message)) between 10 and 5000),
  constraint contact_enquiries_source_page_length check (
    source_page is null or char_length(trim(source_page)) between 1 and 500
  ),
  constraint contact_enquiries_resolution_length check (
    resolution_notes is null or char_length(trim(resolution_notes)) between 1 and 2000
  ),
  constraint contact_enquiries_ip_hash_format check (
    ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'
  )
);

create index contact_enquiries_status_created_idx
  on public.contact_enquiries (status, created_at asc);
create index contact_enquiries_email_created_idx
  on public.contact_enquiries (email, created_at desc);

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  kind public.content_entry_kind not null,
  status public.content_entry_status not null default 'draft',
  slug text not null,
  title text not null,
  summary text,
  body jsonb not null default '{}'::jsonb,
  cover_image_path text,
  alt_text text,
  publication_at timestamptz,
  expires_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint content_entries_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint content_entries_title_length check (char_length(trim(title)) between 2 and 220),
  constraint content_entries_summary_length check (
    summary is null or char_length(trim(summary)) between 1 and 800
  ),
  constraint content_entries_body_object check (jsonb_typeof(body) = 'object'),
  constraint content_entries_alt_text_length check (
    alt_text is null or char_length(trim(alt_text)) between 1 and 500
  ),
  constraint content_entries_publication_shape check (
    status <> 'published' or publication_at is not null
  ),
  constraint content_entries_expiry_after_publication check (
    expires_at is null or publication_at is null or expires_at > publication_at
  )
);

create unique index content_entries_unique_kind_slug_idx
  on public.content_entries (kind, slug);
create index content_entries_publication_idx
  on public.content_entries (kind, publication_at desc)
  where status = 'published';

-- Durable, hashed-key rate-limit windows. Plain IP addresses, credentials,
-- and request bodies never enter this table.
create table public.api_rate_limit_windows (
  bucket text not null,
  key_hash char(64) not null,
  window_started_at timestamptz not null,
  hit_count integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (bucket, key_hash),
  constraint api_rate_limit_bucket_format check (bucket ~ '^[a-z0-9][a-z0-9._-]{1,118}$'),
  constraint api_rate_limit_key_hash_format check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint api_rate_limit_hit_count_positive check (hit_count >= 0)
);

create index api_rate_limit_windows_expiry_idx
  on public.api_rate_limit_windows (window_started_at);

-- Webhook event IDs provide a durable idempotency boundary for payment
-- providers. Payloads are intentionally not retained here.
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payment_reference text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz,
  outcome text not null default 'received',
  failure_code text,
  unique (provider, event_id),
  constraint payment_webhook_events_provider_length check (char_length(trim(provider)) between 2 and 60),
  constraint payment_webhook_events_event_length check (char_length(trim(event_id)) between 2 and 240),
  constraint payment_webhook_events_type_length check (char_length(trim(event_type)) between 2 and 120),
  constraint payment_webhook_events_outcome_length check (char_length(trim(outcome)) between 2 and 80),
  constraint payment_webhook_events_failure_length check (failure_code is null or char_length(trim(failure_code)) between 1 and 120)
);

alter table public.contact_enquiries enable row level security;
alter table public.content_entries enable row level security;
alter table public.api_rate_limit_windows enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Public visitors may read only content explicitly published by an
-- authorised server workflow. All content writes remain RPC-only.
create policy "content_entries_select_published"
  on public.content_entries
  for select
  to anon, authenticated
  using (
    status = 'published'
    and publication_at <= timezone('utc', now())
    and (expires_at is null or expires_at > timezone('utc', now()))
  );

create or replace function public.current_identity_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and account_status = 'active'
    );
$$;

-- Override the original helper so a suspended or deactivated identity
-- cannot gain authority through a previously assigned role.
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
  select public.current_identity_is_active()
    and exists (
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

create or replace function public.can_read_membership_application(
  requested_application_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_identity_is_active()
    and exists (
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

create or replace function public.is_membership_holder(
  requested_membership_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_identity_is_active()
    and exists (
      select 1 from public.memberships
      where id = requested_membership_id and member_id = auth.uid()
    );
$$;

create or replace function public.consume_rate_limit(
  p_scope text,
  p_subject_hash char(64),
  p_window_seconds integer,
  p_max_attempts integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz;
  current_hits integer;
  elapsed_seconds integer;
begin
  if p_scope !~ '^[a-z0-9][a-z0-9._-]{1,118}$'
    or p_subject_hash !~ '^[0-9a-f]{64}$'
    or p_max_attempts < 1
    or p_max_attempts > 10000
    or p_window_seconds < 1
    or p_window_seconds > 86400 then
    raise exception 'Invalid rate-limit request';
  end if;

  insert into public.api_rate_limit_windows (bucket, key_hash, window_started_at, hit_count)
  values (p_scope, p_subject_hash, timezone('utc', now()), 1)
  on conflict (bucket, key_hash) do update
  set
    hit_count = case
      when public.api_rate_limit_windows.window_started_at
        + make_interval(secs => p_window_seconds) <= timezone('utc', now())
        then 1
      else public.api_rate_limit_windows.hit_count + 1
    end,
    window_started_at = case
      when public.api_rate_limit_windows.window_started_at
        + make_interval(secs => p_window_seconds) <= timezone('utc', now())
        then timezone('utc', now())
      else public.api_rate_limit_windows.window_started_at
    end,
    updated_at = timezone('utc', now())
  returning window_started_at, hit_count into current_window, current_hits;

  elapsed_seconds := greatest(
    0,
    floor(extract(epoch from timezone('utc', now()) - current_window))::integer
  );

  return query select
    current_hits <= p_max_attempts,
    case
      when current_hits <= p_max_attempts then 0
      else greatest(1, p_window_seconds - elapsed_seconds)
    end;
end;
$$;

revoke all on function public.current_identity_is_active() from public;
revoke all on function public.consume_rate_limit(text, char(64), integer, integer) from public;
grant execute on function public.current_identity_is_active() to authenticated, service_role;
grant execute on function public.consume_rate_limit(text, char(64), integer, integer) to service_role;

commit;
