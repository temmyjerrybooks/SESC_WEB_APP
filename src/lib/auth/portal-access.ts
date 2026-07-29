import { redirect } from "next/navigation";
import {
  canAccessPortal,
  isAccountActive,
  type PortalAccess,
} from "@/lib/auth/authorization";
import { isFeatureEnabled } from "@/lib/environment/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function signInRedirect(pathname: string, reason?: string) {
  const params = new URLSearchParams({ next: pathname });
  if (reason) {
    params.set("reason", reason);
  }
  return `/login?${params.toString()}`;
}

function configurationUnavailableRedirect() {
  return "/maintenance?reason=configuration";
}

function featureForPortal(access: PortalAccess) {
  return access === "member"
    ? "memberPortal"
    : access === "executive"
      ? "executivePortal"
      : "adminPortal";
}

function activeMembershipDate() {
  return new Date().toISOString().slice(0, 10);
}

function roleCodesFrom(
  assignments: Array<{
    role: { code?: string } | { code?: string }[] | null;
    revoked_at: string | null;
    expires_at: string | null;
  }>,
) {
  const now = Date.now();

  return assignments.flatMap((assignment) => {
    if (
      assignment.revoked_at ||
      (assignment.expires_at !== null && Number.isFinite(Date.parse(assignment.expires_at)) && Date.parse(assignment.expires_at) <= now)
    ) {
      return [];
    }

    const role = assignment.role;
    return Array.isArray(role) ? role.flatMap((item) => item.code ?? []) : role?.code ? [role.code] : [];
  });
}

/**
 * Development previews deliberately contain no private data and are only
 * explorable outside production. A production deployment always fails closed
 * when Supabase configuration is unavailable, and always verifies access on
 * the server even when the proxy has already checked a session.
 */
export async function requirePortalAccess(access: PortalAccess, pathname: string) {
  if (process.env.NODE_ENV === "production" && !isFeatureEnabled(featureForPortal(access))) {
    redirect(configurationUnavailableRedirect());
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production") {
      redirect(configurationUnavailableRedirect());
    }

    return { mode: "development-preview" as const, userId: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(signInRedirect(pathname));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !isAccountActive(profile?.account_status)) {
    redirect(signInRedirect(pathname, "account-unavailable"));
  }

  const { data: assignments, error: roleError } = await supabase
    .from("user_roles")
    .select("revoked_at, expires_at, role:roles(code)")
    .eq("user_id", user.id);

  if (roleError) {
    redirect(signInRedirect(pathname, "access-unavailable"));
  }

  const roleCodes = roleCodesFrom((assignments ?? []) as Array<{
    role: { code?: string } | { code?: string }[] | null;
    revoked_at: string | null;
    expires_at: string | null;
  }>);

  let hasActiveMembership = false;

  if (access === "member") {
    const { data: memberships, error: membershipError } = await supabase
      .from("memberships")
      .select("id")
      .eq("member_id", user.id)
      .eq("status", "active")
      .gte("expires_on", activeMembershipDate())
      .limit(1);

    if (membershipError) {
      redirect(signInRedirect(pathname, "access-unavailable"));
    }

    hasActiveMembership = (memberships?.length ?? 0) > 0;
  }

  if (!canAccessPortal(access, roleCodes, hasActiveMembership)) {
    redirect(signInRedirect(pathname, "access-denied"));
  }

  return { mode: "authenticated" as const, userId: user.id };
}
