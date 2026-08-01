-- Trusted administration, content, contact-management, and invitation RPCs.

begin;

insert into public.permissions (code, name, description)
values
  ('contact.manage', 'Manage contact enquiries', 'Assign and resolve public contact enquiries.'),
  ('newsletter.manage', 'Manage newsletter subscribers', 'Manage consent and suppression records.')
on conflict (code) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission on permission.code in ('contact.manage', 'newsletter.manage')
where role.code = 'super_administrator'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission on permission.code = 'contact.manage'
where role.code = 'support_officer'
on conflict do nothing;

create or replace function public.server_update_member_profile(
  p_actor_id uuid,
  p_given_name text default null,
  p_family_name text default null,
  p_display_name text default null,
  p_phone text default null,
  p_country_code char(2) default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;
  if p_given_name is not null and char_length(trim(p_given_name)) not between 1 and 80
    or p_family_name is not null and char_length(trim(p_family_name)) not between 1 and 80
    or p_display_name is not null and char_length(trim(p_display_name)) not between 1 and 120
    or p_phone is not null and char_length(trim(p_phone)) not between 7 and 32
    or p_country_code is not null and p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid profile update';
  end if;

  update public.profiles
  set
    given_name = nullif(trim(p_given_name), ''),
    family_name = nullif(trim(p_family_name), ''),
    display_name = nullif(trim(p_display_name), ''),
    phone = nullif(trim(p_phone), ''),
    country_code = p_country_code
  where id = p_actor_id;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, null, 'profile', p_actor_id, 'profile.self_updated', '{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.server_upsert_content_entry(
  p_actor_id uuid,
  p_entry_id uuid,
  p_kind public.content_entry_kind,
  p_status public.content_entry_status,
  p_slug text,
  p_title text,
  p_summary text default null,
  p_body jsonb default '{}'::jsonb,
  p_cover_image_path text default null,
  p_alt_text text default null,
  p_publication_at timestamptz default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  required_permission text;
  existing_required_permission text;
  existing_kind public.content_entry_kind;
  entry_id uuid;
  effective_publication_at timestamptz;
begin
  required_permission := case
    when p_kind = 'event' then 'event.manage'
    when p_kind in ('sponsor', 'partner') then 'sponsor.manage'
    when p_kind = 'page' then 'settings.manage'
    else 'content.publish'
  end;

  if not public.actor_has_permission(p_actor_id, required_permission, null) then
    raise exception 'Not authorised to manage this content';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(trim(p_title)) not between 2 and 220
    or jsonb_typeof(coalesce(p_body, '{}'::jsonb)) <> 'object'
    or (p_summary is not null and char_length(trim(p_summary)) not between 1 and 800)
    or (p_alt_text is not null and char_length(trim(p_alt_text)) not between 1 and 500) then
    raise exception 'Invalid content entry';
  end if;

  effective_publication_at := case
    when p_status = 'published' then coalesce(p_publication_at, timezone('utc', now()))
    else p_publication_at
  end;
  if p_expires_at is not null and effective_publication_at is not null
    and p_expires_at <= effective_publication_at then
    raise exception 'Content expiry must follow publication';
  end if;

  if p_entry_id is null then
    insert into public.content_entries (
      kind, status, slug, title, summary, body, cover_image_path, alt_text,
      publication_at, expires_at, author_id, updated_by
    ) values (
      p_kind, p_status, p_slug, p_title, p_summary, coalesce(p_body, '{}'::jsonb),
      p_cover_image_path, p_alt_text, effective_publication_at, p_expires_at, p_actor_id, p_actor_id
    ) returning id into entry_id;
  else
    select kind into existing_kind
    from public.content_entries
    where id = p_entry_id
    for update;
    if existing_kind is null then
      raise exception 'Content entry does not exist';
    end if;

    existing_required_permission := case
      when existing_kind = 'event' then 'event.manage'
      when existing_kind in ('sponsor', 'partner') then 'sponsor.manage'
      when existing_kind = 'page' then 'settings.manage'
      else 'content.publish'
    end;
    if not public.actor_has_permission(p_actor_id, existing_required_permission, null) then
      raise exception 'Not authorised to change this content type';
    end if;

    update public.content_entries
    set
      kind = p_kind,
      status = p_status,
      slug = p_slug,
      title = p_title,
      summary = p_summary,
      body = coalesce(p_body, '{}'::jsonb),
      cover_image_path = p_cover_image_path,
      alt_text = p_alt_text,
      publication_at = effective_publication_at,
      expires_at = p_expires_at,
      updated_by = p_actor_id
    where id = p_entry_id
    returning id into entry_id;
  end if;

  perform public.append_workflow_audit(
    p_actor_id, null, null, 'content_entry', entry_id,
    case when p_status = 'published' then 'content.published' else 'content.saved' end,
    jsonb_build_object('kind', p_kind, 'slug', p_slug)
  );
  return entry_id;
end;
$$;

create or replace function public.server_update_contact_enquiry(
  p_actor_id uuid,
  p_enquiry_id uuid,
  p_status public.contact_enquiry_status,
  p_assigned_to uuid default null,
  p_resolution_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.actor_has_permission(p_actor_id, 'contact.manage', null) then
    raise exception 'Not authorised to manage contact enquiries';
  end if;
  if p_resolution_notes is not null
    and char_length(trim(p_resolution_notes)) not between 1 and 2000 then
    raise exception 'Invalid contact resolution notes';
  end if;

  update public.contact_enquiries
  set
    status = p_status,
    assigned_to = p_assigned_to,
    resolution_notes = nullif(trim(p_resolution_notes), '')
  where id = p_enquiry_id;
  if not found then
    raise exception 'Contact enquiry does not exist';
  end if;

  perform public.append_workflow_audit(
    p_actor_id, null, null, 'contact_enquiry', p_enquiry_id,
    'contact.' || p_status::text, '{}'::jsonb
  );
  return true;
end;
$$;

create or replace function public.server_create_role_invitation(
  p_actor_id uuid,
  p_email text,
  p_role_id uuid,
  p_scope_id uuid,
  p_token_hash char(64),
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  scope_chapter_id uuid;
  target_rank smallint;
  actor_rank smallint;
  invitation_id uuid;
begin
  select chapter_id into scope_chapter_id from public.access_scopes where id = p_scope_id;
  if scope_chapter_id is null and not exists (select 1 from public.access_scopes where id = p_scope_id) then
    raise exception 'Invitation scope does not exist';
  end if;
  if not public.actor_has_permission(p_actor_id, 'role.assign', scope_chapter_id) then
    raise exception 'Not authorised to invite this role';
  end if;
  select privilege_rank into target_rank from public.roles where id = p_role_id;
  select max(role.privilege_rank) into actor_rank
  from public.user_roles as assignment
  join public.roles as role on role.id = assignment.role_id
  where assignment.user_id = p_actor_id
    and assignment.revoked_at is null
    and (assignment.expires_at is null or assignment.expires_at > timezone('utc', now()));
  if target_rank is null or actor_rank is null or actor_rank <= target_rank
    or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_expires_at <= timezone('utc', now())
    or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid role invitation';
  end if;

  insert into public.role_invitations (
    email, role_id, scope_id, invited_by, token_hash, expires_at
  ) values (
    lower(trim(p_email)), p_role_id, p_scope_id, p_actor_id, p_token_hash, p_expires_at
  ) returning id into invitation_id;

  perform public.append_workflow_audit(
    p_actor_id, null, scope_chapter_id, 'role_invitation', invitation_id, 'role.invited',
    jsonb_build_object('role_id', p_role_id, 'scope_id', p_scope_id)
  );
  return invitation_id;
end;
$$;

create or replace function public.server_accept_role_invitation(
  p_actor_id uuid,
  p_token_hash char(64)
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.role_invitations%rowtype;
  actor_email citext;
begin
  if not public.actor_is_active(p_actor_id) or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invitation';
  end if;
  select * into invitation
  from public.role_invitations
  where token_hash = p_token_hash
    and accepted_at is null
    and revoked_at is null
    and expires_at > timezone('utc', now())
  for update;
  if invitation.id is null then
    raise exception 'Invitation is unavailable';
  end if;
  select email into actor_email from public.profiles where id = p_actor_id;
  if lower(actor_email::text) <> lower(invitation.email::text) then
    raise exception 'Invitation email does not match this account';
  end if;

  insert into public.user_roles (user_id, role_id, scope_id, granted_by)
  values (p_actor_id, invitation.role_id, invitation.scope_id, invitation.invited_by)
  on conflict (user_id, role_id, scope_id) where revoked_at is null do nothing;
  update public.role_invitations
  set accepted_at = timezone('utc', now()), accepted_by = p_actor_id
  where id = invitation.id;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, null, 'role_invitation', invitation.id, 'role.accepted', '{}'::jsonb
  );
  return true;
end;
$$;

revoke all on function public.server_update_member_profile(uuid, text, text, text, text, char(2)) from public;
revoke all on function public.server_upsert_content_entry(uuid, uuid, public.content_entry_kind, public.content_entry_status, text, text, text, jsonb, text, text, timestamptz, timestamptz) from public;
revoke all on function public.server_update_contact_enquiry(uuid, uuid, public.contact_enquiry_status, uuid, text) from public;
revoke all on function public.server_create_role_invitation(uuid, text, uuid, uuid, char(64), timestamptz) from public;
revoke all on function public.server_accept_role_invitation(uuid, char(64)) from public;
grant execute on function public.server_update_member_profile(uuid, text, text, text, text, char(2)) to service_role;
grant execute on function public.server_upsert_content_entry(uuid, uuid, public.content_entry_kind, public.content_entry_status, text, text, text, jsonb, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.server_update_contact_enquiry(uuid, uuid, public.contact_enquiry_status, uuid, text) to service_role;
grant execute on function public.server_create_role_invitation(uuid, text, uuid, uuid, char(64), timestamptz) to service_role;
grant execute on function public.server_accept_role_invitation(uuid, char(64)) to service_role;

commit;
