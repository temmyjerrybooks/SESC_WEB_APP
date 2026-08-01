/**
 * Client-side permission helpers are only for presenting the right UI.
 * PostgreSQL RLS and server-side checks remain the source of authority.
 */

export const ROLE_CODES = [
  "visitor",
  "applicant",
  "member",
  "chapter_executive",
  "chapter_chairman",
  "state_coordinator",
  "international_chapter_coordinator",
  "national_executive",
  "content_editor",
  "events_officer",
  "membership_officer",
  "finance_officer",
  "sponsorship_officer",
  "awards_committee_member",
  "support_officer",
  "auditor",
  "super_administrator",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const PERMISSION_CODES = [
  "member.profile.read.self",
  "member.profile.update.self",
  "member.profile.read.scoped",
  "member.profile.manage",
  "application.create",
  "application.read.self",
  "application.update.self",
  "application.review.chapter",
  "application.review.national",
  "payment.create",
  "payment.read.self",
  "payment.submit_receipt",
  "payment.review",
  "membership.read.self",
  "membership.read.scoped",
  "membership.manage",
  "chapter.manage",
  "content.publish",
  "event.manage",
  "sponsor.manage",
  "award.manage",
  "notification.read.self",
  "notification.manage.self",
  "notification.send",
  "role.assign",
  "audit.read",
  "settings.manage",
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];
export type ScopeKind = "global" | "national" | "chapter";

export type PermissionGrant = {
  code: PermissionCode | (string & {});
  scopeKind: ScopeKind;
  chapterId?: string | null;
  expiresAt?: Date | string | null;
};

export function isActiveGrant(
  grant: Pick<PermissionGrant, "expiresAt">,
  now = new Date(),
): boolean {
  if (!grant.expiresAt) {
    return true;
  }

  const expiresAt = new Date(grant.expiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
}

export function scopeAppliesToChapter(
  grant: Pick<PermissionGrant, "scopeKind" | "chapterId" | "expiresAt">,
  chapterId?: string | null,
  now = new Date(),
): boolean {
  if (!isActiveGrant(grant, now)) {
    return false;
  }

  if (grant.scopeKind === "global" || grant.scopeKind === "national") {
    return true;
  }

  return Boolean(chapterId && grant.chapterId === chapterId);
}

export function canDisplayPermission(
  grants: readonly PermissionGrant[],
  requiredPermission: PermissionCode | (string & {}),
  chapterId?: string | null,
  now = new Date(),
): boolean {
  return grants.some(
    (grant) =>
      grant.code === requiredPermission &&
      scopeAppliesToChapter(grant, chapterId, now),
  );
}

export function isPrivilegedRole(role: RoleCode | string): boolean {
  return [
    "chapter_executive",
    "chapter_chairman",
    "state_coordinator",
    "international_chapter_coordinator",
    "national_executive",
    "membership_officer",
    "finance_officer",
    "auditor",
    "super_administrator",
  ].includes(role);
}
