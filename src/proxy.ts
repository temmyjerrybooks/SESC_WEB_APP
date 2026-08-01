import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  getPortalRoute,
  isPortalFeatureEnabled,
} from "@/lib/auth/portal-routing";
import { evaluateFeatureGates } from "@/lib/environment/gates";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function configurationUnavailableResponse(request: NextRequest) {
  const destination = request.nextUrl.clone();
  destination.pathname = "/maintenance";
  destination.searchParams.set("reason", "configuration");
  return NextResponse.redirect(destination);
}

export async function proxy(request: NextRequest) {
  const portalRoute = getPortalRoute(request.nextUrl.pathname);

  if (!portalRoute) {
    return NextResponse.next({ request });
  }

  if (
    process.env.NODE_ENV === "production" &&
    !isPortalFeatureEnabled(portalRoute.access, evaluateFeatureGates(process.env))
  ) {
    return configurationUnavailableResponse(request);
  }

  if (!isSupabaseConfigured()) {
    return process.env.NODE_ENV === "production"
      ? configurationUnavailableResponse(request)
      : NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return process.env.NODE_ENV === "production"
      ? configurationUnavailableResponse(request)
      : NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/member/:path*", "/executive/:path*", "/admin/:path*"],
};
