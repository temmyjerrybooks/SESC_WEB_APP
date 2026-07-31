-- Server-only public submission and applicant workflow RPCs.
--
-- Every function below is executable by service_role only. Next.js verifies
-- a session first and passes the verified actor ID; the database repeats
-- ownership, account-state, and workflow checks before mutation.

begin;

alter table public.newsletter_subscribers
  add column if not exists confirmation_token uuid
  add column if not exists confirmation_sent_at timestamptz;

update public.newsletter_subscribers
set confirmation_token = gen_random_uuid()
where confirmation_token is null;

alter table public.newsletter_subscribers
  alter column confirmation_token set not null;

create unique index if not exists newsletter_subscribers_confirmation_token_idx
  on public.newsletter_subscribers (confirmation_token);

create or replace function public.actor_is_active(p_actor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = p_actor_id and account_status = 'active'
  );
$$;

create or replace function public.actor_has_permission(
  p_actor_id uuid,
  p_permission text,
  p_chapter_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.actor_is_active(p_actor_id)
    and exists (
      select 1
      from public.user_roles as user_role
      join public.role_permissions as role_permission
        on role_permission.role_id = user_role.role_id
      join public.permissions as permission
        on permission.id = role_permission.permission_id
      join public.access_scopes as scope
        on scope.id = user_role.scope_id
      where user_role.user_id = p_actor_id
        and user_role.revoked_at is null
        and (user_role.expires_at is null or user_role.expires_at > timezone('utc', now()))
        and permission.code = p_permission
        and (
          scope.kind in ('global', 'national')
          or (scope.kind = 'chapter' and p_chapter_id is not null and scope.chapter_id = p_chapter_id)
        )
    );
$$;

create or replace function public.append_workflow_audit(
  p_actor_id uuid,
  p_subject_user_id uuid,
  p_chapter_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'Audit metadata must be an object';
  end if;

  insert into public.audit_log (
    actor_id, subject_user_id, chapter_id, entity_type, entity_id, action, metadata
  )
  values (
    p_actor_id, p_subject_user_id, p_chapter_id, p_entity_type, p_entity_id, p_action,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.create_contact_enquiry(
  p_name text,
  p_email text,
  p_subject text,
  p_message text,
  p_source_page text default null,
  p_consented_at timestamptz default timezone('utc', now()),
  p_source_ip_hash text default null
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  enquiry_id uuid;
begin
  if nullif(trim(p_name), '') is null
    or nullif(trim(p_email), '') is null
    or nullif(trim(p_subject), '') is null
    or nullif(trim(p_message), '') is null
    or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (p_source_ip_hash is not null and p_source_ip_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'Invalid contact enquiry';
  end if;

  insert into public.contact_enquiries (
    name, email, subject, message, source_page, consented_at, ip_hash
  )
  values (
    left(trim(p_name), 160),
    lower(trim(p_email)),
    left(trim(p_subject), 180),
    left(trim(p_message), 5000),
    nullif(left(trim(coalesce(p_source_page, '')), 500), ''),
    coalesce(p_consented_at, timezone('utc', now())),
    p_source_ip_hash
  )
  returning contact_enquiries.id into enquiry_id;

  return query select enquiry_id;
end;
$$;

create or replace function public.upsert_newsletter_subscription(
  p_email text,
  p_source_page text default null,
  p_consent_ip_hash text default null
)
returns table (confirmation_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  token uuid;
  subscription_status public.newsletter_subscription_status;
begin
  if nullif(trim(p_email), '') is null
    or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (p_consent_ip_hash is not null and p_consent_ip_hash !~ '^[0-9a-f]{64}$') then
    raise exception 'Invalid newsletter subscription';
  end if;

  insert into public.newsletter_subscribers (
    email, status, consented_at, confirmation_token, confirmation_sent_at, source_page, consent_ip_hash
  )
  values (
    lower(trim(p_email)),
    'pending',
    timezone('utc', now()),
    gen_random_uuid(),
    timezone('utc', now()),
    nullif(left(trim(coalesce(p_source_page, '')), 500), ''),
    p_consent_ip_hash
  )
  on conflict (email) do update
  set
    status = case
      when public.newsletter_subscribers.status = 'suppressed' then 'suppressed'
      else 'pending'
    end,
    consented_at = case
      when public.newsletter_subscribers.status = 'suppressed'
        then public.newsletter_subscribers.consented_at
      else timezone('utc', now())
    end,
    confirmation_token = case
      when public.newsletter_subscribers.status = 'suppressed'
        then public.newsletter_subscribers.confirmation_token
      else gen_random_uuid()
    end,
    confirmation_sent_at = case
      when public.newsletter_subscribers.status = 'suppressed'
        then public.newsletter_subscribers.confirmation_sent_at
      else timezone('utc', now())
    end,
    source_page = case
      when public.newsletter_subscribers.status = 'suppressed'
        then public.newsletter_subscribers.source_page
      else excluded.source_page
    end,
    consent_ip_hash = case
      when public.newsletter_subscribers.status = 'suppressed'
        then public.newsletter_subscribers.consent_ip_hash
      else excluded.consent_ip_hash
    end
  returning newsletter_subscribers.confirmation_token, newsletter_subscribers.status
    into token, subscription_status;

  return query select case
    when subscription_status = 'suppressed' then null
    else token::text
  end;
end;
$$;

create or replace function public.confirm_newsletter_subscription(
  p_confirmation_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated boolean;
begin
  update public.newsletter_subscribers
  set
    status = 'active',
    confirmed_at = coalesce(confirmed_at, timezone('utc', now()))
  where confirmation_token = p_confirmation_token
    and status = 'pending'
  returning true into updated;

  return coalesce(updated, false);
end;
$$;

create or replace function public.unsubscribe_newsletter_subscription(
  p_unsubscribe_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated boolean;
begin
  update public.newsletter_subscribers
  set
    status = 'unsubscribed',
    unsubscribed_at = coalesce(unsubscribed_at, timezone('utc', now()))
  where unsubscribe_token = p_unsubscribe_token
    and status <> 'suppressed'
  returning true into updated;

  return coalesce(updated, false);
end;
$$;

create or replace function public.server_save_membership_application_draft(
  p_actor_id uuid,
  p_chapter_id uuid,
  p_membership_plan_id uuid,
  p_payload jsonb
)
returns table (application_id uuid, reference_code text, status public.application_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_application_id uuid;
  existing_status public.application_status;
  existing_chapter_id uuid;
  existing_plan_id uuid;
  existing_payment_exists boolean;
  result_reference text;
  result_status public.application_status;
  plan_category text;
  first_name_value text;
  last_name_value text;
  phone_value text;
  country_value char(2);
  emergency_contact_value jsonb;
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid application payload';
  end if;

  select plan.category_code into plan_category
  from public.membership_plans as plan
  where plan.id = p_membership_plan_id and plan.status = 'active' and plan.is_public;
  if plan_category is null then
    raise exception 'Selected membership plan is unavailable';
  end if;

  if not exists (
    select 1
    from public.chapters as chapter
    where chapter.id = p_chapter_id and chapter.status = 'active'
  ) then
    raise exception 'Selected chapter is unavailable';
  end if;

  first_name_value := nullif(left(trim(coalesce(p_payload ->> 'firstName', '')), 80), '');
  last_name_value := nullif(left(trim(coalesce(p_payload ->> 'lastName', '')), 80), '');
  phone_value := nullif(left(trim(coalesce(p_payload ->> 'phone', '')), 32), '');
  country_value := upper(left(trim(coalesce(p_payload ->> 'countryCode', 'NG')), 2))::char(2);
  emergency_contact_value := jsonb_build_object(
    'name', left(trim(coalesce(p_payload ->> 'emergencyContactName', '')), 80),
    'phone', left(trim(coalesce(p_payload ->> 'emergencyContactPhone', '')), 32)
  );

  if first_name_value is null
    or last_name_value is null
    or phone_value is null
    or char_length(country_value) <> 2
    or country_value !~ '^[A-Z]{2}$'
    or nullif(trim(coalesce(p_payload ->> 'dateOfBirth', '')), '') is null
    or nullif(trim(coalesce(p_payload ->> 'address', '')), '') is null
    or nullif(trim(coalesce(p_payload ->> 'city', '')), '') is null then
    raise exception 'Incomplete application payload';
  end if;

  select application.id, application.status, application.chapter_id, application.membership_plan_id
    into existing_application_id, existing_status, existing_chapter_id, existing_plan_id
  from public.membership_applications as application
  where application.applicant_id = p_actor_id
    and application.status in ('draft', 'requires_correction')
  order by application.updated_at desc
  limit 1
  for update;

  if existing_application_id is null then
    insert into public.membership_applications as application (
      applicant_id, chapter_id, membership_plan_id, category_code, current_step, status,
      first_name, last_name, date_of_birth, phone, residence_country, address_line_1, city,
      emergency_contact, privacy_consent_at
    )
    values (
      p_actor_id, p_chapter_id, p_membership_plan_id, plan_category, 3, 'draft',
      first_name_value, last_name_value, (p_payload ->> 'dateOfBirth')::date, phone_value,
      country_value, left(trim(p_payload ->> 'address'), 240), left(trim(p_payload ->> 'city'), 120),
      emergency_contact_value,
      case when coalesce((p_payload ->> 'marketingConsent')::boolean, false)
        then timezone('utc', now()) else null end
    )
    returning application.id, application.reference_code, application.status
      into existing_application_id, result_reference, result_status;
  else
    -- A payment is a snapshot of the selected plan and chapter. Changing either
    -- after payment creation requires an explicit cancellation/reissue workflow,
    -- rather than silently allowing payment evidence to activate a different plan.
    select exists (
      select 1
      from public.payments as payment
      where payment.application_id = existing_application_id
    ) into existing_payment_exists;
    if existing_payment_exists
      and (
        existing_chapter_id is distinct from p_chapter_id
        or existing_plan_id is distinct from p_membership_plan_id
      ) then
      raise exception 'The selected chapter or membership plan cannot change after payment creation';
    end if;

    update public.membership_applications as application
    set
      chapter_id = p_chapter_id,
      membership_plan_id = p_membership_plan_id,
      category_code = plan_category,
      current_step = greatest(application.current_step, 3),
      first_name = first_name_value,
      last_name = last_name_value,
      date_of_birth = (p_payload ->> 'dateOfBirth')::date,
      phone = phone_value,
      residence_country = country_value,
      address_line_1 = left(trim(p_payload ->> 'address'), 240),
      city = left(trim(p_payload ->> 'city'), 120),
      emergency_contact = emergency_contact_value,
      privacy_consent_at = case
        when coalesce((p_payload ->> 'marketingConsent')::boolean, false)
          then coalesce(application.privacy_consent_at, timezone('utc', now()))
        else null
      end
    where application.id = existing_application_id
    returning application.reference_code, application.status into result_reference, result_status;
  end if;

  insert into public.membership_application_steps (
    application_id, step_number, step_key, status, data, completed_at, created_by
  )
  values (
    existing_application_id, 1, 'personal_details', 'completed',
    jsonb_build_object('version', 1), timezone('utc', now()), p_actor_id
  )
  on conflict (application_id, step_key) do update
  set status = 'completed', data = excluded.data, completed_at = excluded.completed_at;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, p_chapter_id, 'membership_application', existing_application_id,
    case when result_status = 'draft' then 'application.draft_saved' else 'application.corrected_saved' end,
    jsonb_build_object('plan_id', p_membership_plan_id)
  );

  return query select existing_application_id, result_reference, result_status;
end;
$$;

revoke all on function public.actor_is_active(uuid) from public;
revoke all on function public.actor_has_permission(uuid, text, uuid) from public;
revoke all on function public.append_workflow_audit(uuid, uuid, uuid, text, uuid, text, jsonb) from public;
revoke all on function public.create_contact_enquiry(text, text, text, text, text, timestamptz, text) from public;
revoke all on function public.upsert_newsletter_subscription(text, text, text) from public;
revoke all on function public.confirm_newsletter_subscription(uuid) from public;
revoke all on function public.unsubscribe_newsletter_subscription(uuid) from public;
revoke all on function public.server_save_membership_application_draft(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.actor_is_active(uuid) to service_role;
grant execute on function public.actor_has_permission(uuid, text, uuid) to service_role;
grant execute on function public.create_contact_enquiry(text, text, text, text, text, timestamptz, text) to service_role;
grant execute on function public.upsert_newsletter_subscription(text, text, text) to service_role;
grant execute on function public.confirm_newsletter_subscription(uuid) to service_role;
grant execute on function public.unsubscribe_newsletter_subscription(uuid) to service_role;
grant execute on function public.server_save_membership_application_draft(uuid, uuid, uuid, jsonb) to service_role;

commit;
