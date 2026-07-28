-- RLS and private storage policies for the SESC security foundation.
-- Service-role code bypasses RLS and must remain server-only.

begin;

alter table public.profiles enable row level security;
alter table public.chapters enable row level security;
alter table public.access_scopes enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_chapter_assignments enable row level security;
alter table public.membership_applications enable row level security;
alter table public.payments enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;

-- Profiles contain contact and account information. A member may only read their
-- own record; officers must hold a scoped profile permission.
create policy "profiles_select_self_or_scoped_staff"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.has_permission('member.profile.read.scoped', home_chapter_id)
    or public.has_permission('member.profile.manage', home_chapter_id)
  );

create policy "profiles_update_self_or_scoped_staff"
  on public.profiles
  for update
  to authenticated
  using (
    id = auth.uid()
    or public.has_permission('member.profile.manage', home_chapter_id)
  )
  with check (
    id = auth.uid()
    or public.has_permission('member.profile.manage', home_chapter_id)
  );

-- Active chapter directory data is public. Inactive records are visible only to
-- staff with chapter management authority.
create policy "chapters_select_active_public"
  on public.chapters
  for select
  to anon, authenticated
  using (status = 'active');

create policy "chapters_select_managed_inactive"
  on public.chapters
  for select
  to authenticated
  using (public.has_permission('chapter.manage', id));

create policy "chapters_insert_national_managers"
  on public.chapters
  for insert
  to authenticated
  with check (public.has_permission('chapter.manage', null));

create policy "chapters_update_scoped_managers"
  on public.chapters
  for update
  to authenticated
  using (public.has_permission('chapter.manage', id))
  with check (public.has_permission('chapter.manage', id));

create policy "chapters_delete_national_managers"
  on public.chapters
  for delete
  to authenticated
  using (public.has_permission('chapter.manage', null));

-- Scope, role, and permission data is visible to authenticated users for UI
-- affordances. Mutations remain permission-gated and are additionally protected
-- by the role assignment trigger from the foundation migration.
create policy "access_scopes_select_assigned_or_managed"
  on public.access_scopes
  for select
  to authenticated
  using (
    public.current_user_has_scope(id)
    or public.can_manage_scope(id)
  );

create policy "access_scopes_manage_globally"
  on public.access_scopes
  for all
  to authenticated
  using (public.has_permission('role.assign', null))
  with check (public.has_permission('role.assign', null));

create policy "roles_select_authenticated"
  on public.roles
  for select
  to authenticated
  using (true);

create policy "roles_manage_globally"
  on public.roles
  for all
  to authenticated
  using (public.has_permission('role.assign', null))
  with check (public.has_permission('role.assign', null));

create policy "permissions_select_authenticated"
  on public.permissions
  for select
  to authenticated
  using (true);

create policy "permissions_manage_globally"
  on public.permissions
  for all
  to authenticated
  using (public.has_permission('role.assign', null))
  with check (public.has_permission('role.assign', null));

create policy "role_permissions_select_authenticated"
  on public.role_permissions
  for select
  to authenticated
  using (true);

create policy "role_permissions_manage_globally"
  on public.role_permissions
  for all
  to authenticated
  using (public.has_permission('role.assign', null))
  with check (public.has_permission('role.assign', null));

create policy "user_roles_select_self_or_scope_manager"
  on public.user_roles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_scope(scope_id)
  );

create policy "user_roles_insert_scope_manager"
  on public.user_roles
  for insert
  to authenticated
  with check (public.can_manage_scope(scope_id));

create policy "user_roles_update_scope_manager"
  on public.user_roles
  for update
  to authenticated
  using (public.can_manage_scope(scope_id))
  with check (public.can_manage_scope(scope_id));

create policy "user_roles_delete_scope_manager"
  on public.user_roles
  for delete
  to authenticated
  using (public.can_manage_scope(scope_id));

create policy "chapter_assignments_select_self_or_scoped_staff"
  on public.user_chapter_assignments
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.has_permission('member.profile.read.scoped', chapter_id)
    or public.has_permission('member.profile.manage', chapter_id)
  );

create policy "chapter_assignments_manage_scoped_staff"
  on public.user_chapter_assignments
  for all
  to authenticated
  using (
    public.has_permission('chapter.manage', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
  )
  with check (
    public.has_permission('chapter.manage', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
  );

-- Applicants own their records. Reviewers receive only the chapter or national
-- rows covered by their role scope; finance officers can view the application
-- tied to a payment they are authorised to verify.
create policy "applications_select_owner_or_reviewer"
  on public.membership_applications
  for select
  to authenticated
  using (
    applicant_id = auth.uid()
    or public.has_permission('application.review.chapter', chapter_id)
    or public.has_permission('application.review.national', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
    or public.has_permission('payment.review', chapter_id)
  );

create policy "applications_insert_owner"
  on public.membership_applications
  for insert
  to authenticated
  with check (applicant_id = auth.uid());

create policy "applications_update_owner_or_reviewer"
  on public.membership_applications
  for update
  to authenticated
  using (
    applicant_id = auth.uid()
    or public.has_permission('application.review.chapter', chapter_id)
    or public.has_permission('application.review.national', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
  )
  with check (
    applicant_id = auth.uid()
    or public.has_permission('application.review.chapter', chapter_id)
    or public.has_permission('application.review.national', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
  );

-- Deliberate withdrawal preserves an audit trail, so applications have no
-- client-side DELETE policy.

create policy "payments_select_owner_or_reviewer"
  on public.payments
  for select
  to authenticated
  using (public.can_access_payment(id));

create policy "payments_insert_owner"
  on public.payments
  for insert
  to authenticated
  with check (payer_id = auth.uid());

create policy "payments_update_owner_or_reviewer"
  on public.payments
  for update
  to authenticated
  using (
    payer_id = auth.uid()
    or exists (
      select 1
      from public.membership_applications as application
      where application.id = payments.application_id
        and public.has_permission('payment.review', application.chapter_id)
    )
  )
  with check (
    payer_id = auth.uid()
    or exists (
      select 1
      from public.membership_applications as application
      where application.id = payments.application_id
        and public.has_permission('payment.review', application.chapter_id)
    )
  );

-- Payment records are financial evidence and are never deleted by a client.

create policy "memberships_select_self_or_scoped_staff"
  on public.memberships
  for select
  to authenticated
  using (
    member_id = auth.uid()
    or public.has_permission('membership.read.scoped', chapter_id)
    or public.has_permission('membership.manage', chapter_id)
  );

create policy "memberships_manage_scoped_staff"
  on public.memberships
  for all
  to authenticated
  using (public.has_permission('membership.manage', chapter_id))
  with check (public.has_permission('membership.manage', chapter_id));

-- Audit records are append-only from the client perspective. National/global
-- audit readers can access national events and all scoped chapter events.
create policy "audit_log_select_scoped_auditors"
  on public.audit_log
  for select
  to authenticated
  using (public.has_permission('audit.read', chapter_id));

-- Notifications are server-created. Recipients can only toggle their own
-- read state; the trigger in the foundation migration prevents other changes.
create policy "notifications_select_recipient"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_recipient"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Keep applicant identity documents, profile photos, and manual receipts in
-- private buckets. Object paths must start with the authenticated user's UUID:
--   <auth.uid()>/<application-or-payment-id>/<filename>
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'member-private',
    'member-private',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
  ),
  (
    'payment-receipts',
    'payment-receipts',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

create policy "private_objects_insert_owner_folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('member-private', 'payment-receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "private_objects_select_owner_folder"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('member-private', 'payment-receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "private_objects_update_owner_folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('member-private', 'payment-receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('member-private', 'payment-receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "private_objects_delete_owner_folder"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('member-private', 'payment-receipts')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime delivery is controlled by the notifications table RLS policy.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

commit;
