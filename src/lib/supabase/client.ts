"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig, isSupabaseConfigured } from "./config";

let browserClient: SupabaseClient | undefined;

/**
 * Returns the browser client for user-scoped Supabase requests.
 * This client intentionally uses only the publishable anon key.
 */
export function createClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getPublicSupabaseConfig();
  browserClient = createBrowserClient(url, anonKey);
  return browserClient;
}

export { isSupabaseConfigured };
