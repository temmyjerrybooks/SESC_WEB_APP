import { z } from "zod";

import type { DirectoryEntry } from "@/data/site-content";

const text = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

const isoTimestamp = z.string().trim().refine(
  (value) => Number.isFinite(Date.parse(value)),
  "Expected an ISO-compatible timestamp.",
);

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160);

/**
 * The public renderer deliberately supports prose only. It never consumes raw
 * HTML, rich-text marks, links, embeds, or arbitrary JSON from the CMS.
 */
export const managedNewsBodySchema = z.object({
  eyebrow: text(2, 80).optional(),
  paragraphs: z.array(text(1, 2_000)).min(1).max(24),
}).strict();

const managedNewsEntrySchema = z.object({
  id: z.string().uuid(),
  kind: z.literal("news"),
  status: z.enum(["draft", "published", "archived"]),
  slug,
  title: text(2, 220),
  summary: text(1, 800),
  body: managedNewsBodySchema,
  publicationAt: isoTimestamp.nullable(),
  expiresAt: isoTimestamp.nullable(),
  updatedAt: isoTimestamp.nullable(),
});

export type ManagedNewsEntry = z.infer<typeof managedNewsEntrySchema>;

type ContentEntryRow = {
  id?: unknown;
  kind?: unknown;
  status?: unknown;
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
  body?: unknown;
  publicationAt?: unknown;
  expiresAt?: unknown;
  updatedAt?: unknown;
  publication_at?: unknown;
  expires_at?: unknown;
  updated_at?: unknown;
};

/**
 * Validates the server/RPC response again before it crosses into a browser
 * response or a public page. Malformed records fail closed rather than being
 * interpreted as rich content.
 */
export function parseManagedNewsEntry(value: unknown): ManagedNewsEntry | null {
  if (!value || typeof value !== "object") return null;

  const row = value as ContentEntryRow;
  const parsed = managedNewsEntrySchema.safeParse({
    id: row.id,
    kind: row.kind,
    status: row.status,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    publicationAt: row.publication_at ?? row.publicationAt ?? null,
    expiresAt: row.expires_at ?? row.expiresAt ?? null,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
  });

  return parsed.success ? parsed.data : null;
}

export function isPubliclyVisibleNews(
  entry: ManagedNewsEntry,
  now = new Date(),
): boolean {
  if (entry.status !== "published" || !entry.publicationAt) return false;

  const publicationAt = Date.parse(entry.publicationAt);
  const expiresAt = entry.expiresAt ? Date.parse(entry.expiresAt) : null;

  return publicationAt <= now.getTime() && (expiresAt === null || expiresAt > now.getTime());
}

function formatPublicationDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

/** Converts the validated text-only record into the existing public UI type. */
export function managedNewsDirectoryEntry(entry: ManagedNewsEntry): DirectoryEntry {
  return {
    slug: entry.slug,
    eyebrow: entry.body.eyebrow ?? "SESC news",
    title: entry.title,
    summary: entry.summary,
    body: entry.body.paragraphs,
    badge: "Published",
    facts: entry.publicationAt
      ? [{ label: "Published", value: formatPublicationDate(entry.publicationAt) }]
      : undefined,
  };
}

/**
 * Keep the reviewed development articles available whenever the managed
 * source has no matching public article. A managed article wins on its slug,
 * which gives authorised publishers a safe migration path from a seed item.
 */
export function mergeManagedNewsWithFallback(
  managed: readonly ManagedNewsEntry[],
  fallback: readonly DirectoryEntry[],
): DirectoryEntry[] {
  const published = managed
    .filter((entry) => isPubliclyVisibleNews(entry))
    .sort((left, right) => Date.parse(right.publicationAt ?? "") - Date.parse(left.publicationAt ?? ""));
  const managedEntries = published.map(managedNewsDirectoryEntry);
  const managedSlugs = new Set(managedEntries.map((entry) => entry.slug));

  return [...managedEntries, ...fallback.filter((entry) => !managedSlugs.has(entry.slug))];
}
