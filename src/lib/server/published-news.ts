import "server-only";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  isPubliclyVisibleNews,
  parseManagedNewsEntry,
  type ManagedNewsEntry,
} from "@/lib/content/managed-news";

const publicNewsColumns = [
  "id",
  "kind",
  "status",
  "slug",
  "title",
  "summary",
  "body",
  "publication_at",
  "expires_at",
  "updated_at",
].join(", ");

function visibleRows(rows: unknown): ManagedNewsEntry[] {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    const entry = parseManagedNewsEntry(row);
    return entry && isPubliclyVisibleNews(entry) ? [entry] : [];
  });
}

/**
 * This intentionally uses the request-scoped anonymous/session client, not a
 * service-role client. The published-only RLS policy remains the database
 * boundary for every public read.
 */
export async function getPublishedManagedNews(): Promise<ManagedNewsEntry[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("content_entries")
      .select(publicNewsColumns)
      .eq("kind", "news")
      .eq("status", "published")
      .lte("publication_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("publication_at", { ascending: false });

    return error ? [] : visibleRows(data);
  } catch {
    // The typed development news remains the safe public fallback while a
    // managed-content dependency is unavailable.
    return [];
  }
}

export async function getPublishedManagedNewsBySlug(
  slug: string,
): Promise<ManagedNewsEntry | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("content_entries")
      .select(publicNewsColumns)
      .eq("kind", "news")
      .eq("status", "published")
      .eq("slug", slug)
      .lte("publication_at", now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle();

    if (error) return null;
    const entry = parseManagedNewsEntry(data);
    return entry && isPubliclyVisibleNews(entry) ? entry : null;
  } catch {
    return null;
  }
}
