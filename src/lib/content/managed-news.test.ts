import { describe, expect, it } from "vitest";

import type { DirectoryEntry } from "@/data/site-content";

import {
  isPubliclyVisibleNews,
  managedNewsDirectoryEntry,
  mergeManagedNewsWithFallback,
  parseManagedNewsEntry,
} from "./managed-news";

const id = "11111111-1111-4111-8111-111111111111";
const publicationAt = "2026-07-30T12:00:00.000Z";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id,
    kind: "news",
    status: "published",
    slug: "controlled-live-test",
    title: "Controlled live test",
    summary: "A text-only managed article for controlled testing.",
    body: {
      eyebrow: "Platform update",
      paragraphs: ["This paragraph is rendered as text, not HTML."],
    },
    publication_at: publicationAt,
    expires_at: null,
    updated_at: publicationAt,
    ...overrides,
  };
}

const fallback: DirectoryEntry[] = [{
  slug: "seed-news",
  eyebrow: "Development news",
  title: "Seed article",
  summary: "Static fallback article.",
  body: ["Safe fallback."],
}];

describe("managed news content", () => {
  it("accepts only the bounded text-paragraph structure", () => {
    const entry = parseManagedNewsEntry(row());

    expect(entry).not.toBeNull();
    expect(managedNewsDirectoryEntry(entry!).body).toEqual([
      "This paragraph is rendered as text, not HTML.",
    ]);
    expect(parseManagedNewsEntry(row({ body: { html: "<script>alert(1)</script>" } }))).toBeNull();
    expect(parseManagedNewsEntry(row({ body: { paragraphs: ["safe"], html: "<p>unsafe</p>" } }))).toBeNull();
  });

  it("fails closed for drafts, future articles, and expired articles", () => {
    const now = new Date("2026-07-31T12:00:00.000Z");
    const draft = parseManagedNewsEntry(row({ status: "draft" }));
    const future = parseManagedNewsEntry(row({ publication_at: "2026-08-01T12:00:00.000Z" }));
    const expired = parseManagedNewsEntry(row({ expires_at: "2026-07-30T12:00:00.000Z" }));

    expect(isPubliclyVisibleNews(draft!, now)).toBe(false);
    expect(isPubliclyVisibleNews(future!, now)).toBe(false);
    expect(isPubliclyVisibleNews(expired!, now)).toBe(false);
    expect(mergeManagedNewsWithFallback([draft!, future!, expired!], fallback)).toEqual(fallback);
  });

  it("places valid managed articles before the static fallback and replaces duplicate slugs", () => {
    const entry = parseManagedNewsEntry(row())!;
    const duplicateFallback: DirectoryEntry = {
      ...fallback[0],
      slug: entry.slug,
      title: "Old static article",
    };

    const merged = mergeManagedNewsWithFallback([entry], [duplicateFallback, ...fallback]);

    expect(merged.map((item) => item.slug)).toEqual(["controlled-live-test", "seed-news"]);
    expect(merged[0]?.title).toBe("Controlled live test");
  });
});
