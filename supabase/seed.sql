-- Development-only Supabase seed data.
--
-- These records are intentionally inactive and explicitly labelled as pending
-- approval. They are templates, not assertions that a chapter exists or is
-- authorised for public publication. No profiles, auth.users records,
-- applications, payments, memberships, roles, or notifications are seeded.
--
-- The current schema has no membership-plans or general reference-data table.
-- Membership category codes live on records that require an authenticated
-- profile, so no membership-plan rows can be safely seeded here.

begin;

insert into public.chapters (
  name,
  slug,
  kind,
  state_or_region,
  country_code,
  status
)
values
  (
    'Development State Chapter - approval status unknown',
    'development-state-chapter',
    'state',
    'Location pending approval - development template',
    'NG',
    'inactive'
  ),
  (
    'Development International Chapter - approval status unknown',
    'development-international-chapter',
    'international',
    'Location pending approval - development template',
    'NG',
    'inactive'
  )
on conflict (slug) do nothing;

-- New chapters receive a scope through the chapter trigger. This insert also
-- repairs an incomplete development database while preserving any existing
-- scope label on repeat runs.
insert into public.access_scopes (kind, chapter_id, label)
select
  'chapter',
  chapter.id,
  case chapter.slug
    when 'development-state-chapter'
      then 'Development state chapter - approval status unknown'
    when 'development-international-chapter'
      then 'Development international chapter - approval status unknown'
  end
from public.chapters as chapter
where chapter.slug in (
  'development-state-chapter',
  'development-international-chapter'
)
on conflict (chapter_id) where kind = 'chapter' do nothing;

commit;
