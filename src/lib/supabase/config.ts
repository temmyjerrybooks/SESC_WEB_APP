import {
  readPublicEnvironment,
  type PublicSupabaseConfig,
} from "@/lib/environment/public";

export type { PublicSupabaseConfig } from "@/lib/environment/public";

export function isSupabaseConfigured(): boolean {
  return Boolean(readPublicEnvironment().supabase);
}

/**
 * Auth email and account actions require an explicit release decision in
 * addition to public Supabase configuration. This prevents a deployment from
 * enabling sign-up, password reset, or resend-email UI merely because keys
 * were supplied for a different Supabase feature.
 */
export function isAuthActionsEnabled(): boolean {
  return readPublicEnvironment().authActionsEnabled;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const { supabase } = readPublicEnvironment();

  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Configure the public Supabase settings before enabling this feature.",
    );
  }

  return supabase;
}
