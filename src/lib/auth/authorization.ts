export type PortalAccess = "member" | "executive" | "administrator";

export const EXECUTIVE_PORTAL_ROLE_CODES = [
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
] as const;

const MEMBER_PORTAL_ROLE_CODES = new Set([
  "member",
  ...EXECUTIVE_PORTAL_ROLE_CODES,
  "super_administrator",
]);

const EXECUTIVE_PORTAL_ROLE_CODE_SET = new Set<string>(EXECUTIVE_PORTAL_ROLE_CODES);

export type AccountStatus = "active" | "suspended" | "deactivated" | null | undefined;

/**
 * Browser UI may use role hints for presentation, but this helper is used by
 * server-side route protection. Database RLS remains the authority for records.
 */
export function canAccessPortal(
  access: PortalAccess,
  roleCodes: readonly string[],
  hasActiveMembership: boolean,
): boolean {
  if (access === "administrator") {
    return roleCodes.includes("super_administrator");
  }

  if (access === "executive") {
    return roleCodes.some((role) =>
      EXECUTIVE_PORTAL_ROLE_CODE_SET.has(role) || role === "super_administrator",
    );
  }

  return hasActiveMembership || roleCodes.some((role) => MEMBER_PORTAL_ROLE_CODES.has(role));
}

export function isAccountActive(status: AccountStatus): boolean {
  return status === "active";
}
