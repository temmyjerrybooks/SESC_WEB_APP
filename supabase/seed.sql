-- Development-only Supabase seed data.
--
-- These records are intentionally inactive and explicitly labelled as pending
-- approval. They are templates, not assertions that a chapter exists or is
-- authorised for public publication. No profiles, auth.users records,
-- applications, payments, memberships, roles, or notifications are seeded.
--
-- Membership plans are synthetic local reference data only. They do not
-- establish real dues, eligibility, or public commercial terms.

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

insert into public.membership_plans (
  code, name, description, category_code, amount_minor, currency, term_months, status, is_public
)
values
  (
    'local-standard',
    'Local standard supporter - synthetic test plan',
    'Disposable local-development plan for workflow verification only.',
    'standard',
    1000,
    'NGN',
    12,
    'active',
    true
  )
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  amount_minor = excluded.amount_minor,
  currency = excluded.currency,
  term_months = excluded.term_months,
  status = excluded.status,
  is_public = excluded.is_public;

commit;
