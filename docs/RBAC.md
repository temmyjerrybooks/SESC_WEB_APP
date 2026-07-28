# RBAC and scopes

## Model

Roles are database records, not an editable profile field. A user can hold
multiple roles through user_roles; every grant has an access_scopes record:

- global — platform-wide authority; reserved for super-administration.
- national — authority across SESC chapters.
- chapter — authority only for its linked chapter.

has_permission(permission_code, chapter_id) is the database source of truth.
Global and national grants apply across chapters; chapter grants apply only
when the supplied chapter matches. A null chapter requires national/global
authority.

## Roles

| Role family | Scope | Primary purpose |
| --- | --- | --- |
| Visitor, applicant, member | Global | Own account, application, payment, and membership experience |
| Chapter executive/chairman/coordinator | Chapter | Scoped review and chapter operations |
| National executive | National | Nationwide oversight and chapter administration |
| Membership and finance officers | National or chapter | Application/membership or payment workflows |
| Content, events, sponsorship, awards, support | National or chapter as appropriate | Operational features |
| Auditor | National | Read-only audit review |
| Super administrator | Global | Full platform administration |

The canonical seeded codes and permissions are in the foundation migration and
src/lib/permissions.ts.

## Role assignment

Role mutations require role.assign at the target scope. Database triggers also
prevent self-assignment, scope/type mismatches, alteration of grant identity,
and peer-or-higher privilege assignment. The first super_administrator must be
bootstrapped through a controlled server or Supabase Dashboard operation; it
cannot be self-created from the app.

The UI helper canDisplayPermission is only for showing or hiding controls. It
is never an authorisation boundary. Server routes must validate the session and
call database-backed permission checks; RLS enforces the final decision.
