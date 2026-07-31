import "server-only";

import { createServiceRoleClient, createClient } from "@/lib/supabase/server";

export type VerifiedActor = {
  id: string;
  email: string | null;
};

export class RequestAccessError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    message: string,
  ) {
    super(message);
    this.name = "RequestAccessError";
  }
}

/**
 * Resolves the current user from the server-managed Supabase session. The
 * user ID is never taken from request JSON, query strings, or client state.
 */
export async function requireVerifiedActor(): Promise<VerifiedActor> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new RequestAccessError(401, "Authentication is required.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new RequestAccessError(503, "Account access is temporarily unavailable.");
  }

  if (profile?.account_status !== "active") {
    throw new RequestAccessError(403, "This account is not currently active.");
  }

  return { id: user.id, email: user.email ?? null };
}

/**
 * Permission evaluation is repeated in the service-only database RPC. This
 * check is intentionally a second boundary for route handlers before they
 * call a privileged workflow operation.
 */
export async function requireServerPermission(
  actor: VerifiedActor,
  permission: string,
  chapterId?: string | null,
): Promise<void> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("actor_has_permission", {
    p_actor_id: actor.id,
    p_permission: permission,
    p_chapter_id: chapterId ?? null,
  });

  if (error) {
    throw new RequestAccessError(503, "Permission verification is temporarily unavailable.");
  }

  if (data !== true) {
    throw new RequestAccessError(403, "You do not have permission to complete that action.");
  }
}
