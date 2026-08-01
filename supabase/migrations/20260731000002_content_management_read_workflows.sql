-- Server-authorised management reads for managed public content.
-- Public reads remain constrained by the existing published-only RLS policy.

begin;

create or replace function public.server_list_manageable_content_entries(
  p_actor_id uuid,
  p_kind public.content_entry_kind
)
returns table (
  id uuid,
  kind public.content_entry_kind,
  status public.content_entry_status,
  slug text,
  title text,
  summary text,
  body jsonb,
  publication_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  required_permission text;
begin
  if p_kind is null then
    raise exception 'A content type is required';
  end if;

  required_permission := case
    when p_kind = 'event' then 'event.manage'
    when p_kind in ('sponsor', 'partner') then 'sponsor.manage'
    when p_kind = 'page' then 'settings.manage'
    else 'content.publish'
  end;

  if not public.actor_has_permission(p_actor_id, required_permission, null) then
    raise exception 'Not authorised to list this content type';
  end if;

  perform public.append_workflow_audit(
    p_actor_id,
    null,
    null,
    'content_entry',
    null,
    'content.management_listed',
    jsonb_build_object('kind', p_kind)
  );

  return query
  select
    entry.id,
    entry.kind,
    entry.status,
    entry.slug,
    entry.title,
    entry.summary,
    entry.body,
    entry.publication_at,
    entry.expires_at,
    entry.updated_at
  from public.content_entries as entry
  where entry.kind = p_kind
  order by entry.updated_at desc, entry.created_at desc
  limit 100;
end;
$$;

revoke all on function public.server_list_manageable_content_entries(
  uuid,
  public.content_entry_kind
) from public;
grant execute on function public.server_list_manageable_content_entries(
  uuid,
  public.content_entry_kind
) to service_role;

commit;
