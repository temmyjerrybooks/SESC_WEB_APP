-- Complete the reviewed browser-to-server workflow paths without broadening
-- browser RLS. These helpers are executable by service_role only; Next.js
-- first verifies the authenticated actor and the functions repeat the actor,
-- scope, current-record, and audit checks inside PostgreSQL.

begin;

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

  -- A current verification must match the payment status. Historical rows are
  -- deliberately superseded after a resubmission, so they must not block the
  -- next authorised review simply because the payment now has a new state.
  if new.is_current and (
    (new.decision = 'approved' and current_payment_status <> 'approved')
    or (new.decision = 'rejected' and current_payment_status <> 'rejected')
    or (
      new.decision = 'needs_resubmission'
      and current_payment_status <> 'needs_resubmission'
    )
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

create or replace function public.server_prepare_payment_receipt_review(
  p_actor_id uuid,
  p_payment_id uuid
)
returns table (receipt_id uuid, bucket_id text, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_owner_id uuid;
  payment_chapter_id uuid;
  result_receipt_id uuid;
  result_bucket_id text;
  result_storage_path text;
begin
  select payment.payer_id, application.chapter_id
  into payment_owner_id, payment_chapter_id
  from public.payments as payment
  join public.membership_applications as application on application.id = payment.application_id
  where payment.id = p_payment_id;

  if payment_chapter_id is null
    or not public.actor_has_permission(p_actor_id, 'payment.review', payment_chapter_id) then
    raise exception 'Not authorised to inspect this payment receipt';
  end if;

  select receipt.id, receipt.bucket_id, receipt.storage_path
  into result_receipt_id, result_bucket_id, result_storage_path
  from public.payment_receipts as receipt
  where receipt.payment_id = p_payment_id and receipt.status = 'submitted'
  order by receipt.receipt_version desc
  limit 1;

  if result_receipt_id is null then
    raise exception 'No submitted payment receipt is available';
  end if;

  perform public.append_workflow_audit(
    p_actor_id, payment_owner_id, payment_chapter_id, 'payment_receipt', result_receipt_id,
    'payment.receipt_viewed', jsonb_build_object('payment_id', p_payment_id)
  );

  return query select result_receipt_id, result_bucket_id, result_storage_path;
end;
$$;

create or replace function public.server_prepare_member_document_review(
  p_actor_id uuid,
  p_application_id uuid,
  p_document_id uuid
)
returns table (document_id uuid, bucket_id text, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  application_owner_id uuid;
  application_chapter_id uuid;
  result_document_id uuid;
  result_bucket_id text;
  result_storage_path text;
begin
  select applicant_id, chapter_id
  into application_owner_id, application_chapter_id
  from public.membership_applications
  where id = p_application_id;

  if application_chapter_id is null
    or not (
      public.actor_has_permission(p_actor_id, 'application.review.chapter', application_chapter_id)
      or public.actor_has_permission(p_actor_id, 'application.review.national', application_chapter_id)
      or public.actor_has_permission(p_actor_id, 'membership.manage', application_chapter_id)
    ) then
    raise exception 'Not authorised to inspect this application document';
  end if;

  select document.id, document.bucket_id, document.storage_path
  into result_document_id, result_bucket_id, result_storage_path
  from public.member_documents as document
  where document.id = p_document_id
    and document.application_id = p_application_id
    and document.status in ('pending', 'verified');

  if result_document_id is null then
    raise exception 'The requested document is unavailable';
  end if;

  perform public.append_workflow_audit(
    p_actor_id, application_owner_id, application_chapter_id, 'member_document', result_document_id,
    'member_document.reviewed', jsonb_build_object('application_id', p_application_id)
  );

  return query select result_document_id, result_bucket_id, result_storage_path;
end;
$$;

create or replace function public.server_list_member_documents_for_review(
  p_actor_id uuid,
  p_application_id uuid
)
returns table (document_id uuid, document_kind public.member_document_kind, status public.member_document_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  application_chapter_id uuid;
begin
  select chapter_id
  into application_chapter_id
  from public.membership_applications
  where id = p_application_id;

  if application_chapter_id is null
    or not (
      public.actor_has_permission(p_actor_id, 'application.review.chapter', application_chapter_id)
      or public.actor_has_permission(p_actor_id, 'application.review.national', application_chapter_id)
      or public.actor_has_permission(p_actor_id, 'membership.manage', application_chapter_id)
    ) then
    raise exception 'Not authorised to inspect this application';
  end if;

  return query
  select document.id, document.document_kind, document.status
  from public.member_documents as document
  where document.application_id = p_application_id
    and document.status in ('pending', 'verified')
  order by document.document_kind;
end;
$$;

create or replace function public.server_review_membership_application(
  p_actor_id uuid,
  p_application_id uuid,
  p_decision public.application_status,
  p_notes text default null
)
returns public.application_status
language plpgsql
security definer
set search_path = public
as $$
declare
  application_chapter_id uuid;
  application_member_id uuid;
  application_plan_id uuid;
  application_plan_amount integer;
  application_plan_currency char(3);
  current_status public.application_status;
  approved_payment_id uuid;
begin
  select
    application.chapter_id,
    application.applicant_id,
    application.membership_plan_id,
    plan.amount_minor,
    plan.currency,
    application.status
  into
    application_chapter_id,
    application_member_id,
    application_plan_id,
    application_plan_amount,
    application_plan_currency,
    current_status
  from public.membership_applications as application
  join public.membership_plans as plan on plan.id = application.membership_plan_id
  where application.id = p_application_id
  for update;

  if application_chapter_id is null
    or not (
      public.actor_has_permission(p_actor_id, 'application.review.chapter', application_chapter_id)
      or public.actor_has_permission(p_actor_id, 'application.review.national', application_chapter_id)
      or public.actor_has_permission(p_actor_id, 'membership.manage', application_chapter_id)
    ) then
    raise exception 'Not authorised to review this application';
  end if;
  if application_member_id = p_actor_id then
    raise exception 'An applicant cannot review their own application';
  end if;
  if p_decision not in ('under_review', 'requires_correction', 'approved', 'rejected')
    or current_status not in ('submitted', 'under_review', 'resubmitted') then
    raise exception 'Invalid application review transition';
  end if;
  if p_decision in ('requires_correction', 'rejected')
    and nullif(trim(coalesce(p_notes, '')), '') is null then
    raise exception 'A review reason is required';
  end if;

  select payment.id into approved_payment_id
  from public.payments as payment
  where payment.application_id = p_application_id
    and payment.status = 'approved'
    and payment.membership_plan_id = application_plan_id
    and payment.chapter_id = application_chapter_id
    and payment.amount_minor = application_plan_amount
    and payment.currency = application_plan_currency
  order by payment.verified_at desc nulls last
  limit 1;
  if p_decision = 'approved' and approved_payment_id is null then
    raise exception 'A verified payment is required before approval';
  end if;

  update public.membership_applications
  set
    status = p_decision,
    reviewed_by = p_actor_id,
    reviewed_at = timezone('utc', now()),
    review_notes = nullif(left(trim(coalesce(p_notes, '')), 2000), '')
  where id = p_application_id;

  if p_decision = 'approved' then
    perform public.server_activate_eligible_membership(p_application_id, approved_payment_id, p_actor_id);
  end if;

  perform public.append_workflow_audit(
    p_actor_id, application_member_id, application_chapter_id, 'membership_application', p_application_id,
    'application.' || p_decision::text, jsonb_build_object('previous_status', current_status)
  );

  insert into public.notifications (user_id, category, title, body, action_url, created_by)
  values (
    application_member_id,
    'application',
    case p_decision
      when 'approved' then 'Application approved'
      when 'rejected' then 'Application update'
      when 'requires_correction' then 'Action required for your application'
      else 'Application under review'
    end,
    case p_decision
      when 'approved' then 'Your application has been approved.'
      when 'rejected' then 'Your application could not be approved. Review the private update in your secure application.'
      when 'requires_correction' then 'Additional information is required before review can continue.'
      else 'An authorised reviewer is now assessing your application.'
    end,
    case when p_decision in ('requires_correction', 'rejected') then '/membership/apply' else '/member' end,
    p_actor_id
  );

  return p_decision;
end;
$$;

create or replace function public.server_review_manual_payment(
  p_actor_id uuid,
  p_payment_id uuid,
  p_decision public.payment_verification_decision,
  p_notes text default null
)
returns public.payment_status
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_status_value public.payment_status;
  application_id_value uuid;
  payer_id_value uuid;
  chapter_id_value uuid;
  payment_plan_id uuid;
  payment_chapter_id uuid;
  application_plan_id uuid;
  payment_amount_minor integer;
  payment_currency char(3);
  application_plan_amount integer;
  application_plan_currency char(3);
  receipt_id_value uuid;
  next_attempt smallint;
  next_status public.payment_status;
begin
  select
    payment.status,
    payment.application_id,
    payment.payer_id,
    application.chapter_id,
    payment.membership_plan_id,
    payment.chapter_id,
    application.membership_plan_id,
    payment.amount_minor,
    payment.currency,
    plan.amount_minor,
    plan.currency
  into
    payment_status_value,
    application_id_value,
    payer_id_value,
    chapter_id_value,
    payment_plan_id,
    payment_chapter_id,
    application_plan_id,
    payment_amount_minor,
    payment_currency,
    application_plan_amount,
    application_plan_currency
  from public.payments as payment
  join public.membership_applications as application on application.id = payment.application_id
  join public.membership_plans as plan on plan.id = application.membership_plan_id
  where payment.id = p_payment_id
  for update;

  if chapter_id_value is null
    or not public.actor_has_permission(p_actor_id, 'payment.review', chapter_id_value) then
    raise exception 'Not authorised to review this payment';
  end if;
  if payer_id_value = p_actor_id then
    raise exception 'A payer cannot review their own payment';
  end if;
  if payment_status_value <> 'pending_verification' then
    raise exception 'This payment is not awaiting verification';
  end if;
  if payment_plan_id is distinct from application_plan_id
    or payment_chapter_id is distinct from chapter_id_value
    or payment_amount_minor is distinct from application_plan_amount
    or payment_currency is distinct from application_plan_currency then
    raise exception 'This payment no longer matches the application membership selection';
  end if;
  if p_decision in ('rejected', 'needs_resubmission')
    and nullif(trim(coalesce(p_notes, '')), '') is null then
    raise exception 'A payment review reason is required';
  end if;

  select id into receipt_id_value
  from public.payment_receipts
  where payment_id = p_payment_id and status = 'submitted'
  order by receipt_version desc
  limit 1
  for update;
  if receipt_id_value is null then
    raise exception 'A submitted receipt is required';
  end if;

  next_status := case p_decision
    when 'approved' then 'approved'::public.payment_status
    when 'rejected' then 'rejected'::public.payment_status
    when 'needs_resubmission' then 'needs_resubmission'::public.payment_status
  end;

  update public.payment_receipts
  set
    status = case p_decision
      when 'approved' then 'accepted'::public.payment_receipt_status
      when 'rejected' then 'rejected'::public.payment_receipt_status
      else 'needs_replacement'::public.payment_receipt_status
    end,
    reviewed_by = p_actor_id,
    reviewed_at = timezone('utc', now()),
    review_notes = nullif(left(trim(coalesce(p_notes, '')), 2000), '')
  where id = receipt_id_value;

  update public.payments
  set
    status = next_status,
    verified_by = p_actor_id,
    verified_at = timezone('utc', now()),
    verification_notes = nullif(left(trim(coalesce(p_notes, '')), 2000), '')
  where id = p_payment_id;

  update public.payment_verifications
  set is_current = false, superseded_at = timezone('utc', now())
  where payment_id = p_payment_id and is_current;
  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.payment_verifications
  where payment_id = p_payment_id;
  insert into public.payment_verifications (
    payment_id, attempt_number, decision, verified_by, notes, is_current
  ) values (
    p_payment_id, next_attempt, p_decision, p_actor_id,
    nullif(left(trim(coalesce(p_notes, '')), 2000), ''), true
  );

  if p_decision = 'approved' then
    perform public.server_activate_eligible_membership(application_id_value, p_payment_id, p_actor_id);
  end if;

  perform public.append_workflow_audit(
    p_actor_id, payer_id_value, chapter_id_value, 'payment', p_payment_id,
    'payment.' || p_decision::text, jsonb_build_object('receipt_id', receipt_id_value)
  );

  insert into public.notifications (user_id, category, title, body, action_url, created_by)
  values (
    payer_id_value,
    'payment',
    case p_decision
      when 'approved' then 'Payment confirmed'
      when 'rejected' then 'Payment update'
      else 'Payment receipt needs attention'
    end,
    case p_decision
      when 'approved' then 'Your payment has been verified.'
      when 'rejected' then 'Your payment could not be verified. Review the private update in your secure application.'
      else 'Please submit a replacement receipt using your secure application.'
    end,
    case when p_decision in ('rejected', 'needs_resubmission') then '/membership/apply' else '/member' end,
    p_actor_id
  );

  return next_status;
end;
$$;

revoke all on function public.server_prepare_payment_receipt_review(uuid, uuid) from public;
revoke all on function public.server_prepare_member_document_review(uuid, uuid, uuid) from public;
revoke all on function public.server_list_member_documents_for_review(uuid, uuid) from public;
grant execute on function public.server_prepare_payment_receipt_review(uuid, uuid) to service_role;
grant execute on function public.server_prepare_member_document_review(uuid, uuid, uuid) to service_role;
grant execute on function public.server_list_member_documents_for_review(uuid, uuid) to service_role;

commit;
