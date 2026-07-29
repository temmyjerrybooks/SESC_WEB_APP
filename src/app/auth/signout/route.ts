import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { safeRelativePath } from "@/lib/auth/safe-redirect";
import { getPublicSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST-only logout avoids a cross-site GET changing a visitor's session.
 * The redirect is local-only and clearing cookies is attempted even if the
 * provider session is already invalid.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Invalid sign-out request." }, { status: 403 });
  }

  const destination = new URL(
    safeRelativePath(request.nextUrl.searchParams.get("next"), "/"),
    request.url,
  );
  const response = NextResponse.redirect(destination, { status: 303 });

  if (!isSupabaseConfigured()) {
    return response;
  }

  try {
    const config = getPublicSupabaseConfig();
    const supabase = createServerClient(config.url, config.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    await supabase.auth.signOut();
  } catch {
    // Respond with the same safe redirect without leaking configuration detail.
  }

  return response;
}
