export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Auth email and account actions require an explicit release decision in
 * addition to public Supabase configuration. This prevents a deployment from
 * enabling sign-up, password reset, or resend-email UI merely because keys
 * were supplied for a different Supabase feature.
 */
export function isAuthActionsEnabled(): boolean {
  return (
    isSupabaseConfigured() &&
    process.env.NEXT_PUBLIC_AUTH_ACTIONS_ENABLED === "true"
  );
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}
