import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { safeRelativePath } from "@/lib/auth/safe-redirect";
import { isFeatureEnabled } from "@/lib/environment/server";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function maintenanceRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/maintenance?reason=configuration", request.url));
}

function loginErrorRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/login?reason=link-expired", request.url));
}

/**
 * Exchanges one-time Supabase Auth codes on the server and limits the
 * return destination to an internal route. The route is never active until
 * the server-side authentication feature gate is explicitly satisfied.
 */
export async function GET(request: NextRequest) {
  if (!isFeatureEnabled("authentication")) {
    return maintenanceRedirect(request);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return loginErrorRedirect(request);
  }

  let config: ReturnType<typeof getPublicSupabaseConfig>;
  try {
    config = getPublicSupabaseConfig();
  } catch {
    return maintenanceRedirect(request);
  }

  const response = NextResponse.redirect(
    new URL(safeRelativePath(request.nextUrl.searchParams.get("next"), "/member"), request.url),
  );
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? loginErrorRedirect(request) : response;
}
