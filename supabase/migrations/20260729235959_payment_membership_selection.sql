-- Bind every payment to the membership selection that created it. This runs
-- after membership plans are introduced and before any membership workflow RPC
-- reads or writes the snapshot columns.

begin;

alter table public.payments
  add column if not exists membership_plan_id uuid
    references public.membership_plans (id) on delete restrict,
  add column if not exists chapter_id uuid
    references public.chapters (id) on delete restrict;

-- Existing historical rows are backfilled where the application has a plan.
-- Rows that predate plan selection remain deliberately ineligible for approval
-- until a controlled remediation, because guessing a payment's selection is
-- unsafe.
update public.payments as payment
set
  membership_plan_id = application.membership_plan_id,
  chapter_id = application.chapter_id
from public.membership_applications as application
where application.id = payment.application_id
  and (payment.membership_plan_id is null or payment.chapter_id is null);

create index if not exists payments_membership_selection_idx
  on public.payments (application_id, membership_plan_id, chapter_id, status, created_at desc);

commit;
