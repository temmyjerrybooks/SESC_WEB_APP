-- Bound every server-proxied private upload to a short-lived, service-authorised
-- intent. This prevents unbounded orphan uploads and makes completion safe to
-- retry without removing evidence that another request has already recorded.

begin;

create table if not exists public.private_upload_intents (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.membership_applications(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  document_kind text not null check (document_kind in ('profile_photo', 'identity_document', 'payment_receipt')),
  bucket_id text not null check (bucket_id in ('member-private', 'membership-documents', 'payment-receipts')),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_extension text not null check (file_extension in ('jpg', 'jpeg', 'png', 'webp', 'pdf')),
  byte_size integer not null check (byte_size between 1 and 4194304),
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '10 minutes',
  consumed_at timestamptz,
  abandoned_at timestamptz,
  cleanup_claimed_at timestamptz,
  cleaned_at timestamptz,
  registered_document_id uuid references public.member_documents(id) on delete set null,
  registered_receipt_id uuid references public.payment_receipts(id) on delete set null,
  constraint private_upload_intents_one_resource check (
    (application_id is null) <> (payment_id is null)
  ),
  constraint private_upload_intents_kind_resource_bucket check (
    (document_kind = 'profile_photo' and application_id is not null and payment_id is null and bucket_id = 'member-private')
    or (document_kind = 'identity_document' and application_id is not null and payment_id is null and bucket_id = 'membership-documents')
    or (document_kind = 'payment_receipt' and payment_id is not null and application_id is null and bucket_id = 'payment-receipts')
  ),
  constraint private_upload_intents_path_owner_bound check (
    (document_kind in ('profile_photo', 'identity_document')
      and storage_path ~ ('^private/' || actor_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'))
    or (document_kind = 'payment_receipt'
      and storage_path ~ ('^receipts/' || actor_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'))
  ),
  constraint private_upload_intents_consumption_links_record check (
    (consumed_at is null and registered_document_id is null and registered_receipt_id is null)
    or (consumed_at is not null and (registered_document_id is null) <> (registered_receipt_id is null))
  ),
  constraint private_upload_intents_expiry_after_creation check (expires_at > created_at)
);

create index if not exists private_upload_intents_active_application_idx
  on public.private_upload_intents (actor_id, application_id, expires_at)
  where consumed_at is null and abandoned_at is null and cleaned_at is null;
create index if not exists private_upload_intents_active_payment_idx
  on public.private_upload_intents (actor_id, payment_id, expires_at)
  where consumed_at is null and abandoned_at is null and cleaned_at is null;

alter table public.private_upload_intents enable row level security;
revoke all on table public.private_upload_intents from anon, authenticated;

-- The Storage schema is not mutated with SQL. This service-only worklist is
-- consumed by trusted application code, which calls the Storage API to remove
-- each object and then marks the intent clean only after that removal succeeds.
-- Calling it before every new upload bounds abandoned/orphaned private objects
-- even without a scheduler; a host may also invoke it as maintenance work.
create or replace function public.server_list_stale_private_upload_intents(
  p_limit integer default 25
)
returns table (intent_id uuid, bucket_id text, storage_path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit not between 1 and 100 then
    raise exception 'Invalid private-upload cleanup limit';
  end if;

  return query
  with candidates as (
    select intent.id
    from public.private_upload_intents as intent
    where intent.consumed_at is null
      and intent.cleaned_at is null
      and (intent.cleanup_claimed_at is null or intent.cleanup_claimed_at <= timezone('utc', now()) - interval '10 minutes')
      and (intent.abandoned_at is not null or intent.expires_at <= timezone('utc', now()))
      and not exists (
        select 1 from public.member_documents as document
        where document.storage_path = intent.storage_path
      )
      and not exists (
        select 1 from public.payment_receipts as receipt
        where receipt.storage_path = intent.storage_path
      )
    order by coalesce(intent.abandoned_at, intent.expires_at) asc
    limit p_limit
    for update skip locked
  )
  update public.private_upload_intents as intent
  set cleanup_claimed_at = timezone('utc', now())
  where intent.id in (select id from candidates)
  returning intent.id, intent.bucket_id, intent.storage_path;
end;
$$;

create or replace function public.server_mark_private_upload_intent_cleaned(
  p_upload_intent_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned boolean := false;
begin
  update public.private_upload_intents as intent
  set cleaned_at = timezone('utc', now())
  where intent.id = p_upload_intent_id
    and intent.consumed_at is null
    and intent.cleaned_at is null
    and intent.cleanup_claimed_at is not null
    and (intent.abandoned_at is not null or intent.expires_at <= timezone('utc', now()))
    and not exists (
      select 1 from public.member_documents as document
      where document.storage_path = intent.storage_path
    )
    and not exists (
      select 1 from public.payment_receipts as receipt
      where receipt.storage_path = intent.storage_path
    )
  returning true into cleaned;

  return coalesce(cleaned, false);
end;
$$;

create or replace function public.server_release_private_upload_intent_cleanup(
  p_upload_intent_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  released boolean := false;
begin
  update public.private_upload_intents as intent
  set cleanup_claimed_at = null
  where intent.id = p_upload_intent_id
    and intent.consumed_at is null
    and intent.cleaned_at is null
    and intent.cleanup_claimed_at is not null
  returning true into released;

  return coalesce(released, false);
end;
$$;

create or replace function public.server_create_private_upload_intent(
  p_actor_id uuid,
  p_application_id uuid,
  p_payment_id uuid,
  p_document_kind text,
  p_bucket_id text,
  p_storage_path text,
  p_mime_type text,
  p_file_extension text,
  p_byte_size integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_owner_id uuid;
  application_status_value public.application_status;
  payment_owner_id uuid;
  payment_status_value public.payment_status;
  outstanding_count integer;
  intent_id uuid;
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;
  if (p_application_id is null) = (p_payment_id is null)
    or p_document_kind not in ('profile_photo', 'identity_document', 'payment_receipt')
    or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or p_file_extension not in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    or (p_file_extension in ('jpg', 'jpeg') and p_mime_type <> 'image/jpeg')
    or (p_file_extension = 'png' and p_mime_type <> 'image/png')
    or (p_file_extension = 'webp' and p_mime_type <> 'image/webp')
    or (p_file_extension = 'pdf' and p_mime_type <> 'application/pdf')
    or p_byte_size not between 1 and 4194304 then
    raise exception 'Invalid private-upload intent';
  end if;

  if p_application_id is not null then
    if p_document_kind not in ('profile_photo', 'identity_document')
      or (p_document_kind = 'profile_photo' and p_bucket_id <> 'member-private')
      or (p_document_kind = 'identity_document' and p_bucket_id <> 'membership-documents')
      or (p_document_kind = 'profile_photo' and p_mime_type = 'application/pdf')
      or p_storage_path !~ ('^private/' || p_actor_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
      raise exception 'Invalid private document intent';
    end if;

    select application.applicant_id, application.status
    into application_owner_id, application_status_value
    from public.membership_applications as application
    where application.id = p_application_id
    for update;
    if application_owner_id is distinct from p_actor_id
      or application_status_value not in ('draft', 'requires_correction') then
      raise exception 'The application cannot accept a document';
    end if;
  else
    if p_document_kind <> 'payment_receipt'
      or p_bucket_id <> 'payment-receipts'
      or p_storage_path !~ ('^receipts/' || p_actor_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') then
      raise exception 'Invalid payment receipt intent';
    end if;

    select payment.payer_id, payment.status
    into payment_owner_id, payment_status_value
    from public.payments as payment
    where payment.id = p_payment_id
    for update;
    if payment_owner_id is distinct from p_actor_id
      or payment_status_value not in ('pending_receipt', 'needs_resubmission') then
      raise exception 'This payment cannot accept a receipt';
    end if;
  end if;

  select count(*) into outstanding_count
  from public.private_upload_intents as intent
  where intent.actor_id = p_actor_id
    and intent.application_id is not distinct from p_application_id
    and intent.payment_id is not distinct from p_payment_id
    and intent.consumed_at is null
    and intent.abandoned_at is null
    and intent.cleaned_at is null
    and intent.expires_at > timezone('utc', now());
  if outstanding_count >= 3 then
    raise exception 'Too many outstanding private-upload requests';
  end if;

  insert into public.private_upload_intents (
    actor_id, application_id, payment_id, document_kind, bucket_id, storage_path,
    mime_type, file_extension, byte_size
  ) values (
    p_actor_id, p_application_id, p_payment_id, p_document_kind, p_bucket_id, p_storage_path,
    p_mime_type, p_file_extension, p_byte_size
  )
  returning id into intent_id;

  return intent_id;
end;
$$;

create or replace function public.server_get_private_upload_intent(
  p_actor_id uuid,
  p_upload_intent_id uuid,
  p_application_id uuid,
  p_payment_id uuid,
  p_document_kind text
)
returns table (
  bucket_id text,
  storage_path text,
  mime_type text,
  file_extension text,
  byte_size integer,
  registered_document_id uuid,
  registered_receipt_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.actor_is_active(p_actor_id)
    or (p_application_id is null) = (p_payment_id is null) then
    raise exception 'Active authentication is required';
  end if;

  return query
  select
    intent.bucket_id,
    intent.storage_path,
    intent.mime_type,
    intent.file_extension,
    intent.byte_size,
    intent.registered_document_id,
    intent.registered_receipt_id
  from public.private_upload_intents as intent
  where intent.id = p_upload_intent_id
    and intent.actor_id = p_actor_id
    and intent.application_id is not distinct from p_application_id
    and intent.payment_id is not distinct from p_payment_id
    and intent.document_kind = p_document_kind
    and intent.cleaned_at is null
    and intent.abandoned_at is null
    and intent.cleanup_claimed_at is null
    and (
      intent.consumed_at is not null
      or intent.expires_at > timezone('utc', now())
    );

  if not found then
    raise exception 'The private-upload request is unavailable';
  end if;
end;
$$;

create or replace function public.server_abandon_private_upload_intent(
  p_actor_id uuid,
  p_upload_intent_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  abandoned boolean := false;
begin
  update public.private_upload_intents as intent
  set abandoned_at = timezone('utc', now())
  where intent.id = p_upload_intent_id
    and intent.actor_id = p_actor_id
    and intent.consumed_at is null
    and intent.abandoned_at is null
    and intent.cleaned_at is null
    and intent.cleanup_claimed_at is null
    and not exists (
      select 1 from public.member_documents as document
      where document.storage_path = intent.storage_path
    )
    and not exists (
      select 1 from public.payment_receipts as receipt
      where receipt.storage_path = intent.storage_path
    )
  returning true into abandoned;

  return coalesce(abandoned, false);
end;
$$;

-- Applicants receive only their own document kind and verification state
-- through this service-only projection. Browser RLS remains closed for the
-- private document table and storage paths never leave the trusted boundary.
create or replace function public.server_list_own_member_document_statuses(
  p_actor_id uuid,
  p_application_id uuid
)
returns table (
  document_kind public.member_document_kind,
  status public.member_document_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  application_owner_id uuid;
begin
  if not public.actor_is_active(p_actor_id) then
    raise exception 'Active authentication is required';
  end if;

  select application.applicant_id into application_owner_id
  from public.membership_applications as application
  where application.id = p_application_id;
  if application_owner_id is distinct from p_actor_id then
    raise exception 'The application is unavailable';
  end if;

  return query
  select document.document_kind, document.status
  from public.member_documents as document
  where document.application_id = p_application_id
    and document.owner_id = p_actor_id
  order by document.document_kind;
end;
$$;

drop function if exists public.server_register_member_document(
  uuid, uuid, public.member_document_kind, text, text, text, text, integer, char(64)
);

create function public.server_register_member_document(
  p_actor_id uuid,
  p_application_id uuid,
  p_document_kind public.member_document_kind,
  p_bucket_id text,
  p_storage_path text,
  p_mime_type text,
  p_file_extension text,
  p_byte_size integer,
  p_checksum_sha256 char(64),
  p_upload_intent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  intent_record record;
  document_id uuid;
  application_owner uuid;
  application_status public.application_status;
begin
  if not public.actor_is_active(p_actor_id)
    or p_document_kind not in ('profile_photo', 'identity_document')
    or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or p_file_extension not in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    or (p_file_extension in ('jpg', 'jpeg') and p_mime_type <> 'image/jpeg')
    or (p_file_extension = 'png' and p_mime_type <> 'image/png')
    or (p_file_extension = 'webp' and p_mime_type <> 'image/webp')
    or (p_file_extension = 'pdf' and p_mime_type <> 'application/pdf')
    or p_byte_size not between 1 and 4194304
    or p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid private document metadata';
  end if;

  select
    intent.id,
    intent.mime_type,
    intent.file_extension,
    intent.byte_size,
    intent.expires_at,
    intent.consumed_at,
    intent.abandoned_at,
    intent.cleanup_claimed_at,
    intent.cleaned_at,
    intent.registered_document_id
  into intent_record
  from public.private_upload_intents as intent
  where intent.id = p_upload_intent_id
    and intent.actor_id = p_actor_id
    and intent.application_id = p_application_id
    and intent.payment_id is null
    and intent.document_kind = p_document_kind::text
    and intent.bucket_id = p_bucket_id
    and intent.storage_path = p_storage_path
  for update;

  if not found then
    raise exception 'The private-upload request is unavailable';
  end if;
  if intent_record.consumed_at is not null then
    if intent_record.registered_document_id is not null then
      return intent_record.registered_document_id;
    end if;
    raise exception 'The private-upload request has already been used';
  end if;
  if intent_record.abandoned_at is not null
    or intent_record.cleanup_claimed_at is not null
    or intent_record.cleaned_at is not null
    or intent_record.expires_at <= timezone('utc', now())
    or intent_record.mime_type <> p_mime_type
    or intent_record.file_extension <> p_file_extension
    or intent_record.byte_size <> p_byte_size then
    raise exception 'The private-upload request is no longer valid';
  end if;

  select application.applicant_id, application.status
    into application_owner, application_status
  from public.membership_applications as application
  where application.id = p_application_id
  for update;
  if application_owner is distinct from p_actor_id
    or application_status not in ('draft', 'requires_correction') then
    raise exception 'The application cannot accept a document';
  end if;

  update public.member_documents as document
  set status = 'superseded'
  where document.application_id = p_application_id
    and document.document_kind = p_document_kind
    and document.status in ('pending', 'verified');

  insert into public.member_documents (
    owner_id, application_id, document_kind, bucket_id, storage_path, mime_type,
    file_extension, byte_size, checksum_sha256, uploaded_by
  ) values (
    p_actor_id, p_application_id, p_document_kind, p_bucket_id, p_storage_path, p_mime_type,
    p_file_extension, p_byte_size, p_checksum_sha256, p_actor_id
  )
  returning id into document_id;

  update public.private_upload_intents as intent
  set consumed_at = timezone('utc', now()), registered_document_id = document_id
  where intent.id = p_upload_intent_id;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, null, 'member_document', document_id, 'document.registered',
    jsonb_build_object('application_id', p_application_id, 'kind', p_document_kind)
  );

  return document_id;
end;
$$;

drop function if exists public.server_register_payment_receipt(
  uuid, uuid, text, text, text, integer, char(64)
);

create function public.server_register_payment_receipt(
  p_actor_id uuid,
  p_payment_id uuid,
  p_storage_path text,
  p_mime_type text,
  p_file_extension text,
  p_byte_size integer,
  p_checksum_sha256 char(64),
  p_upload_intent_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  intent_record record;
  payment_owner uuid;
  payment_status public.payment_status;
  next_version smallint;
  receipt_id uuid;
begin
  if not public.actor_is_active(p_actor_id)
    or p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
    or p_file_extension not in ('jpg', 'jpeg', 'png', 'webp', 'pdf')
    or (p_file_extension in ('jpg', 'jpeg') and p_mime_type <> 'image/jpeg')
    or (p_file_extension = 'png' and p_mime_type <> 'image/png')
    or (p_file_extension = 'webp' and p_mime_type <> 'image/webp')
    or (p_file_extension = 'pdf' and p_mime_type <> 'application/pdf')
    or p_byte_size not between 1 and 4194304
    or p_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid receipt metadata';
  end if;

  select
    intent.id,
    intent.mime_type,
    intent.file_extension,
    intent.byte_size,
    intent.expires_at,
    intent.consumed_at,
    intent.abandoned_at,
    intent.cleanup_claimed_at,
    intent.cleaned_at,
    intent.registered_receipt_id
  into intent_record
  from public.private_upload_intents as intent
  where intent.id = p_upload_intent_id
    and intent.actor_id = p_actor_id
    and intent.payment_id = p_payment_id
    and intent.application_id is null
    and intent.document_kind = 'payment_receipt'
    and intent.bucket_id = 'payment-receipts'
    and intent.storage_path = p_storage_path
  for update;

  if not found then
    raise exception 'The private-upload request is unavailable';
  end if;
  if intent_record.consumed_at is not null then
    if intent_record.registered_receipt_id is not null then
      return intent_record.registered_receipt_id;
    end if;
    raise exception 'The private-upload request has already been used';
  end if;
  if intent_record.abandoned_at is not null
    or intent_record.cleanup_claimed_at is not null
    or intent_record.cleaned_at is not null
    or intent_record.expires_at <= timezone('utc', now())
    or intent_record.mime_type <> p_mime_type
    or intent_record.file_extension <> p_file_extension
    or intent_record.byte_size <> p_byte_size then
    raise exception 'The private-upload request is no longer valid';
  end if;

  select payment.payer_id, payment.status into payment_owner, payment_status
  from public.payments as payment
  where payment.id = p_payment_id
  for update;
  if payment_owner is distinct from p_actor_id
    or payment_status not in ('pending_receipt', 'needs_resubmission') then
    raise exception 'This payment cannot accept a receipt';
  end if;

  update public.payment_receipts as receipt
  set status = 'superseded'
  where receipt.payment_id = p_payment_id
    and receipt.status in ('submitted', 'needs_replacement', 'accepted');

  select coalesce(max(receipt.receipt_version), 0) + 1 into next_version
  from public.payment_receipts as receipt
  where receipt.payment_id = p_payment_id;

  insert into public.payment_receipts (
    payment_id, receipt_version, uploaded_by, storage_path, mime_type, file_extension,
    byte_size, checksum_sha256
  ) values (
    p_payment_id, next_version, p_actor_id, p_storage_path, p_mime_type,
    p_file_extension, p_byte_size, p_checksum_sha256
  )
  returning id into receipt_id;

  update public.payments as payment
  set receipt_path = p_storage_path, status = 'pending_verification', submitted_at = timezone('utc', now())
  where payment.id = p_payment_id;

  update public.private_upload_intents as intent
  set consumed_at = timezone('utc', now()), registered_receipt_id = receipt_id
  where intent.id = p_upload_intent_id;

  perform public.append_workflow_audit(
    p_actor_id, p_actor_id, null, 'payment_receipt', receipt_id, 'payment.receipt_submitted',
    jsonb_build_object('payment_id', p_payment_id, 'version', next_version)
  );

  return receipt_id;
end;
$$;

revoke all on function public.server_list_stale_private_upload_intents(integer) from public;
revoke all on function public.server_mark_private_upload_intent_cleaned(uuid) from public;
revoke all on function public.server_release_private_upload_intent_cleanup(uuid) from public;
revoke all on function public.server_create_private_upload_intent(uuid, uuid, uuid, text, text, text, text, text, integer) from public;
revoke all on function public.server_get_private_upload_intent(uuid, uuid, uuid, uuid, text) from public;
revoke all on function public.server_abandon_private_upload_intent(uuid, uuid) from public;
revoke all on function public.server_list_own_member_document_statuses(uuid, uuid) from public;
revoke all on function public.server_register_member_document(uuid, uuid, public.member_document_kind, text, text, text, text, integer, char(64), uuid) from public;
revoke all on function public.server_register_payment_receipt(uuid, uuid, text, text, text, integer, char(64), uuid) from public;
grant execute on function public.server_list_stale_private_upload_intents(integer) to service_role;
grant execute on function public.server_mark_private_upload_intent_cleaned(uuid) to service_role;
grant execute on function public.server_release_private_upload_intent_cleanup(uuid) to service_role;
grant execute on function public.server_create_private_upload_intent(uuid, uuid, uuid, text, text, text, text, text, integer) to service_role;
grant execute on function public.server_get_private_upload_intent(uuid, uuid, uuid, uuid, text) to service_role;
grant execute on function public.server_abandon_private_upload_intent(uuid, uuid) to service_role;
grant execute on function public.server_list_own_member_document_statuses(uuid, uuid) to service_role;
grant execute on function public.server_register_member_document(uuid, uuid, public.member_document_kind, text, text, text, text, integer, char(64), uuid) to service_role;
grant execute on function public.server_register_payment_receipt(uuid, uuid, text, text, text, integer, char(64), uuid) to service_role;

commit;
