-- Server-only membership, document, payment, and review transactions.

begin;

create or replace function public.server_register_member_document(
  p_actor_id uuid,
  p_application_id uuid,
  p_document_kind public.member_document_kind,
  p_bucket_id text,
  p_storage_path text,
  p_mime_type text,
  p_file_extension text,
  p_byte_size integer,
  p_checksum_sha256 char(64)
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  document_id uuid;
  application_owner uuid;
  application_status public.application_status;
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;
  if p_document_kind not in ('profile_photo', 'identity_document')
    or p_bucket_id not in ('member-private', 'membership-documents')
    or (p_document_kind = 'profile_photo' and p_bucket_id <> 'member-private')
    or (p_document_kind = 'identity_document' and p_bucket_id <> 'membership-documents')
    or (p_document_kind = 'profile_photo' and p_mime_type = 'application/pdf')
    or p_storage_path !~ ('^private/' || p_actor_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or p_file_extension not in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    or p_byte_size not between 1 and 5242880
    or p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid private document metadata';
  end if;

  select applicant_id, status
    into application_owner, application_status
  from public.membership_applications
  where id = p_application_id
  for update;

  if application_owner is distinct from p_actor_id
    or application_status not in ('draft', 'requires_correction') then
    raise exception 'The application cannot accept a document';
  end if;

  update public.member_documents
  set status = 'superseded'
  where application_id = p_application_id
    and document_kind = p_document_kind
    and status in ('pending', 'verified');

  insert into public.member_documents (
    owner_id, application_id, document_kind, bucket_id, storage_path, mime_type,
    file_extension, byte_size, checksum_sha256, uploaded_by
  )
  values (
    p_actor_id, p_application_id, p_document_kind, p_bucket_id, p_storage_path, p_mime_type,
    p_file_extension, p_byte_size, p_checksum_sha256, p_actor_id
  )
  returning id into document_id;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, null, 'member_document', document_id, 'document.registered',
    jsonb_build_object('application_id', p_application_id, 'kind', p_document_kind)
  );

  return document_id;
end;
$$;

create or replace function public.server_submit_membership_application(
  p_actor_id uuid,
  p_application_id uuid,
  p_marketing_consent boolean default false
)
returns table (application_id uuid, reference_code text, status public.application_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  application_owner uuid;
  application_status public.application_status;
  application_chapter_id uuid;
  application_plan_id uuid;
  application_reference text;
  submitted_status public.application_status;
  plan_amount integer;
  plan_currency char(3);
  valid_document_count integer;
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;

  select application.applicant_id, application.status, application.chapter_id, application.membership_plan_id, application.reference_code
    into application_owner, application_status, application_chapter_id, application_plan_id, application_reference
  from public.membership_applications as application
  where application.id = p_application_id
  for update;

  if application_owner is distinct from p_actor_id
    or application_status not in ('draft', 'requires_correction') then
    raise exception 'This application cannot be submitted';
  end if;

  select count(distinct document.document_kind) into valid_document_count
  from public.member_documents as document
  where document.application_id = p_application_id
    and document.owner_id = p_actor_id
    and document.document_kind in ('profile_photo', 'identity_document')
    and document.status in ('pending', 'verified');
  if valid_document_count <> 2 then
    raise exception 'Required private documents are incomplete';
  end if;

  select plan.amount_minor, plan.currency into plan_amount, plan_currency
  from public.membership_plans as plan
  where plan.id = application_plan_id and plan.status = 'active' and plan.is_public;
  if plan_amount is null then
    raise exception 'Selected membership plan is unavailable';
  end if;

  submitted_status := case
    when application_status = 'requires_correction' then 'resubmitted'::public.application_status
    else 'submitted'::public.application_status
  end;

  update public.membership_applications as application
  set
    status = submitted_status,
    current_step = 13,
    declaration_accepted_at = timezone('utc', now()),
    privacy_consent_at = case
      when p_marketing_consent then coalesce(application.privacy_consent_at, timezone('utc', now()))
      else null
    end
  where application.id = p_application_id;

  insert into public.payments (
    application_id, payer_id, membership_plan_id, chapter_id, method, status, amount_minor, currency
  )
  select
    p_application_id, p_actor_id, application_plan_id, application_chapter_id,
    'manual_bank_transfer', 'pending_receipt', plan_amount, plan_currency
  where not exists (
    select 1 from public.payments as payment where payment.application_id = p_application_id
  );

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, application_chapter_id, 'membership_application', p_application_id,
    case when submitted_status = 'resubmitted' then 'application.resubmitted' else 'application.submitted' end,
    jsonb_build_object('plan_id', application_plan_id)
  );

  insert into public.notifications (user_id, category, title, body, action_url, created_by)
  values (
    p_actor_id,
    'application',
    'Application received',
    'Your membership application is awaiting authorised review.',
    '/member',
    p_actor_id
  );

  return query select p_application_id, application_reference, submitted_status;
end;
$$;

create or replace function public.server_register_payment_receipt(
  p_actor_id uuid,
  p_payment_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_file_extension text,
  p_byte_size integer,
  p_checksum_sha256 char(64)
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_owner uuid;
  payment_status public.payment_status;
  next_version smallint;
  receipt_id uuid;
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;
  if p_storage_path !~ ('^receipts/' || p_actor_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
    or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or p_file_extension not in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    or p_byte_size not between 1 and 5242880
    or p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid receipt metadata';
  end if;

  select payer_id, status into payment_owner, payment_status
  from public.payments
  where id = p_payment_id
  for update;
  if payment_owner is distinct from p_actor_id
    or payment_status not in ('pending_receipt', 'needs_resubmission') then
    raise exception 'This payment cannot accept a receipt';
  end if;

  update public.payment_receipts
  set status = 'superseded'
  where payment_id = p_payment_id
    and status in ('submitted', 'needs_replacement', 'accepted');

  select coalesce(max(receipt_version), 0) + 1 into next_version
  from public.payment_receipts
  where payment_id = p_payment_id;

  insert into public.payment_receipts (
    payment_id, receipt_version, uploaded_by, storage_path, mime_type, file_extension,
    byte_size, checksum_sha256
  )
  values (
    p_payment_id, next_version, p_actor_id, p_storage_path, p_mime_type, p_file_extension,
    p_byte_size, p_checksum_sha256
  )
  returning id into receipt_id;

  update public.payments
  set receipt_path = p_storage_path, status = 'pending_verification', submitted_at = timezone('utc', now())
  where id = p_payment_id;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, null, 'payment_receipt', receipt_id, 'payment.receipt_submitted',
    jsonb_build_object('payment_id', p_payment_id, 'version', next_version)
  );

  return receipt_id;
end;
$$;

create or replace function public.server_activate_eligible_membership(
  p_application_id uuid,
  p_payment_id uuid,
  p_actor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_id uuid;
  application_member_id uuid;
  application_chapter_id uuid;
  application_plan_id uuid;
  application_plan_amount integer;
  application_plan_currency char(3);
  category text;
  term_month_count smallint;
  payment_is_approved boolean;
begin
  select
    application.applicant_id,
    application.chapter_id,
    application.membership_plan_id,
    plan.amount_minor,
    plan.currency,
    application.category_code,
    plan.term_months
  into
    application_member_id,
    application_chapter_id,
    application_plan_id,
    application_plan_amount,
    application_plan_currency,
    category,
    term_month_count
  from public.membership_applications as application
  join public.membership_plans as plan on plan.id = application.membership_plan_id
  where application.id = p_application_id and application.status = 'approved';

  select exists (
    select 1
    from public.payments as payment
    where payment.id = p_payment_id
      and payment.application_id = p_application_id
      and payment.status = 'approved'
      and payment.membership_plan_id = application_plan_id
      and payment.chapter_id = application_chapter_id
      and payment.amount_minor = application_plan_amount
      and payment.currency = application_plan_currency
  ) into payment_is_approved;

  if application_member_id is null or not payment_is_approved then
    return null;
  end if;

  select id into membership_id
  from public.memberships
  where application_id = p_application_id;
  if membership_id is not null then
    return membership_id;
  end if;

  insert into public.memberships (
    application_id, member_id, chapter_id, category_code, status, issue_date, expires_on,
    activated_at, activated_by, activation_payment_id
  )
  values (
    p_application_id, application_member_id, application_chapter_id, category, 'active',
    current_date, (current_date + make_interval(months => term_month_count))::date,
    timezone('utc', now()), p_actor_id, p_payment_id
  )
  returning id into membership_id;

  perform public.append_workflow_audit(
    p_actor_id, application_member_id, application_chapter_id, 'membership', membership_id,
    'membership.activated', jsonb_build_object('application_id', p_application_id, 'payment_id', p_payment_id)
  );

  insert into public.notifications (user_id, category, title, body, action_url, created_by)
  values (
    application_member_id,
    'membership',
    'Membership activated',
    'Your SESC membership is active. Your membership number is available in your member area.',
    '/member',
    p_actor_id
  );

  return membership_id;
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
      when 'rejected' then 'Your application could not be approved. Review the private update in your member area.'
      when 'requires_correction' then 'Additional information is required before review can continue.'
      else 'An authorised reviewer is now assessing your application.'
    end,
    '/member',
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
  receipt_id_value uuid;
  next_attempt smallint;
  next_status public.payment_status;
begin
  select payment.status, payment.application_id, payment.payer_id, application.chapter_id
    into payment_status_value, application_id_value, payer_id_value, chapter_id_value
  from public.payments as payment
  join public.membership_applications as application on application.id = payment.application_id
  where payment.id = p_payment_id
  for update;

  if chapter_id_value is null
    or not public.actor_has_permission(p_actor_id, 'payment.review', chapter_id_value) then
    raise exception 'Not authorised to review this payment';
  end if;
  if payment_status_value <> 'pending_verification' then
    raise exception 'This payment is not awaiting verification';
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
      when 'rejected' then 'Your payment could not be verified. Review the private update in your member area.'
      else 'Please submit a replacement receipt using the member area.'
    end,
    '/member',
    p_actor_id
  );

  return next_status;
end;
$$;

create or replace function public.server_set_membership_status(
  p_actor_id uuid,
  p_membership_id uuid,
  p_status public.membership_status,
  p_reason text default null
)
returns public.membership_status
language plpgsql
security definer
set search_path = public
as $$
declare
  member_id_value uuid;
  chapter_id_value uuid;
  current_status_value public.membership_status;
  expiry_date_value date;
begin
  select membership.member_id, membership.chapter_id, membership.status, membership.expires_on
  into member_id_value, chapter_id_value, current_status_value, expiry_date_value
  from public.memberships as membership
  where membership.id = p_membership_id
  for update;
  if chapter_id_value is null
    or not public.actor_has_permission(p_actor_id, 'membership.manage', chapter_id_value) then
    raise exception 'Not authorised to change membership status';
  end if;
  if p_status not in ('active', 'suspended')
    or (p_status = 'suspended' and nullif(trim(coalesce(p_reason, '')), '') is null) then
    raise exception 'Invalid membership status request';
  end if;
  if (p_status = 'suspended' and current_status_value <> 'active')
    or (
      p_status = 'active'
      and (current_status_value <> 'suspended' or expiry_date_value < current_date)
    ) then
    raise exception 'Invalid membership status transition';
  end if;

  update public.memberships
  set
    status = p_status,
    suspended_at = case when p_status = 'suspended' then timezone('utc', now()) else null end,
    suspension_reason = case
      when p_status = 'suspended' then left(trim(p_reason), 2000)
      else null
    end
  where id = p_membership_id;

  perform public.append_workflow_audit(
    p_actor_id, member_id_value, chapter_id_value, 'membership', p_membership_id,
    'membership.' || p_status::text, '{}'::jsonb
  );
  return p_status;
end;
$$;

-- Rebuild sensitive read policies so suspended users cannot use their
-- pre-existing browser session to fetch member workflows directly.
drop policy if exists "applications_select_owner_or_reviewer" on public.membership_applications;
create policy "applications_select_owner_or_reviewer"
  on public.membership_applications
  for select
  to authenticated
  using (public.can_read_membership_application(id));

drop policy if exists "payments_select_owner" on public.payments;
create policy "payments_select_owner"
  on public.payments
  for select
  to authenticated
  using (payer_id = auth.uid() and public.current_identity_is_active());

drop policy if exists "memberships_select_self_or_scoped_staff" on public.memberships;
create policy "memberships_select_self_or_scoped_staff"
  on public.memberships
  for select
  to authenticated
  using (
    public.current_identity_is_active()
    and (
      member_id = auth.uid()
      or public.has_permission('membership.read.scoped', chapter_id)
      or public.has_permission('membership.manage', chapter_id)
    )
  );

drop policy if exists "notifications_select_recipient" on public.notifications;
create policy "notifications_select_recipient"
  on public.notifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.current_identity_is_active()
  );

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
  if auth.uid() is null or not public.current_identity_is_active() then
    raise exception 'Active authentication is required to update a notification';
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
  if auth.uid() is null or not public.current_identity_is_active() then
    raise exception 'Active authentication is required to update notifications';
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

revoke all on function public.server_register_member_document(uuid, uuid, public.member_document_kind, text, text, text, text, integer, char(64)) from public;
revoke all on function public.server_submit_membership_application(uuid, uuid, boolean) from public;
revoke all on function public.server_register_payment_receipt(uuid, uuid, text, text, text, integer, char(64)) from public;
revoke all on function public.server_activate_eligible_membership(uuid, uuid, uuid) from public;
revoke all on function public.server_review_membership_application(uuid, uuid, public.application_status, text) from public;
revoke all on function public.server_review_manual_payment(uuid, uuid, public.payment_verification_decision, text) from public;
revoke all on function public.server_set_membership_status(uuid, uuid, public.membership_status, text) from public;
grant execute on function public.server_register_member_document(uuid, uuid, public.member_document_kind, text, text, text, text, integer, char(64)) to service_role;
grant execute on function public.server_submit_membership_application(uuid, uuid, boolean) to service_role;
grant execute on function public.server_register_payment_receipt(uuid, uuid, text, text, text, integer, char(64)) to service_role;
grant execute on function public.server_review_membership_application(uuid, uuid, public.application_status, text) to service_role;
grant execute on function public.server_review_manual_payment(uuid, uuid, public.payment_verification_decision, text) to service_role;
grant execute on function public.server_set_membership_status(uuid, uuid, public.membership_status, text) to service_role;

commit;
