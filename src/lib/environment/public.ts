import { z } from "zod";

export type EnvironmentInput = Record<string, string | undefined>;

export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalUrl = z.preprocess(
  blankToUndefined,
  z.string().trim().url().optional().catch(undefined),
);

const optionalNonEmptyString = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional().catch(undefined),
);

const optionalBooleanFlag = z.preprocess(
  blankToUndefined,
  z.enum(["true", "false"]).optional().catch(undefined),
);

/**
 * Browser-safe configuration only. Invalid values are treated as missing so
 * public UI can remain fail-closed without exposing configuration details.
 */
export const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_AUTH_ACTIONS_ENABLED: optionalBooleanFlag,
  NEXT_PUBLIC_SITE_URL: optionalUrl,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalNonEmptyString,
});

export type PublicEnvironment = {
  supabase: PublicSupabaseConfig | null;
  authActionsEnabled: boolean;
  siteUrl?: string;
  turnstileSiteKey?: string;
};

/**
 * Returns an HTTPS origin only when the configured URL is a bare canonical
 * origin. Authentication and email callbacks must never inherit a path,
 * credentials, query string, fragment, or insecure scheme from deployment
 * configuration.
 */
export function trustedHttpsSiteOrigin(siteUrl: string | undefined): string | undefined {
  if (!siteUrl) return undefined;

  try {
    const parsed = new URL(siteUrl);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function readPublicEnvironment(
  environment: EnvironmentInput = process.env,
): PublicEnvironment {
  const parsed = publicEnvironmentSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: environment.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: environment.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_AUTH_ACTIONS_ENABLED:
      environment.NEXT_PUBLIC_AUTH_ACTIONS_ENABLED,
    NEXT_PUBLIC_SITE_URL: environment.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY:
      environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });

  const supabase =
    parsed.NEXT_PUBLIC_SUPABASE_URL && parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? {
          url: parsed.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: parsed.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        }
      : null;

  return {
    supabase,
    authActionsEnabled:
      Boolean(supabase) && parsed.NEXT_PUBLIC_AUTH_ACTIONS_ENABLED === "true",
    siteUrl: parsed.NEXT_PUBLIC_SITE_URL,
    turnstileSiteKey: parsed.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  };
}
