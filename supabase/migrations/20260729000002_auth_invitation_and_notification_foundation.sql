-- Auth-adjacent foundations: server-issued role invitations and recipient-only
-- notification mutations. No browser table-write policy is introduced here.

begin;

create table public.role_invitations (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  role_id uuid not null references public.roles (id) on delete restrict,
  scope_id uuid not null references public.access_scopes (id) on delete restrict,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint role_invitations_email_length check (
    char_length(trim(email::text)) between 3 and 320
  ),
  constraint role_invitations_token_hash_format check (
    token_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint role_invitations_expiry_future check (expires_at > created_at),
  constraint role_invitations_acceptance_shape check (
    (accepted_at is null and accepted_by is null)
    or (accepted_at is not null and accepted_by is not null)
  )
);

create unique index role_invitations_one_active_target_idx
  on public.role_invitations (email, role_id, scope_id)
  where accepted_at is null and revoked_at is null;
create index role_invitations_expiry_idx
  on public.role_invitations (expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.role_invitations enable row level security;

alter table public.notifications
  add column if not exists created_by uuid
    references public.profiles (id) on delete set null,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_at timestamptz
    not null default timezone('utc', now());

create index if not exists notifications_user_archive_idx
  on public.notifications (user_id, archived_at, created_at desc);

drop trigger if exists z_notifications_updated_at on public.notifications;
create trigger z_notifications_updated_at
  before update on public.notifications
  for each row execute procedure public.set_row_updated_at();

create or replace function public.mark_notification_read(
  requested_notification_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update a notification';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, timezone('utc', now()))
  where id = requested_notification_id
    and user_id = auth.uid()
    and archived_at is null
  returning true into changed;

  return coalesce(changed, false);
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to update notifications';
  end if;

  update public.notifications
  set read_at = timezone('utc', now())
  where user_id = auth.uid()
    and read_at is null
    and archived_at is null;

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.mark_all_notifications_read() to authenticated, service_role;

commit;
