-- Pre-production client-write lockdown.
--
-- The public Supabase anon key is intentionally browser-visible. Until the
-- approved server-side application, payment, upload, reviewer, and RBAC APIs
-- exist, authenticated browser clients must not be able to write protected
-- workflow data directly through PostgREST or Storage.
--
-- Service-role server code bypasses RLS and is the only permitted future write
-- path after application-level authorisation, audit logging, and retention
-- controls are implemented.

begin;

-- No browser-side RBAC or role-assignment mutations.
drop policy if exists "access_scopes_manage_globally" on public.access_scopes;
drop policy if exists "roles_manage_globally" on public.roles;
drop policy if exists "permissions_manage_globally" on public.permissions;
drop policy if exists "role_permissions_manage_globally" on public.role_permissions;
drop policy if exists "user_roles_insert_scope_manager" on public.user_roles;
drop policy if exists "user_roles_update_scope_manager" on public.user_roles;
drop policy if exists "user_roles_delete_scope_manager" on public.user_roles;

-- No browser-side membership or payment lifecycle mutations before the secure
-- workflow is live. Read policies remain in place for future authorised views.
drop policy if exists "applications_insert_owner" on public.membership_applications;
drop policy if exists "applications_update_owner_or_reviewer" on public.membership_applications;
drop policy if exists "payments_insert_owner" on public.payments;
drop policy if exists "payments_update_owner_or_reviewer" on public.payments;
drop policy if exists "memberships_manage_scoped_staff" on public.memberships;

-- No direct identity-document, profile-photo, or payment-receipt upload from
-- authenticated browser clients. Private object reads remain owner-scoped.
drop policy if exists "private_objects_insert_owner_folder" on storage.objects;
drop policy if exists "private_objects_update_owner_folder" on storage.objects;
drop policy if exists "private_objects_delete_owner_folder" on storage.objects;

commit;
