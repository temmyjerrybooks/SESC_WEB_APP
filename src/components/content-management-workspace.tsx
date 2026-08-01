"use client";

import { useCallback, useMemo, useState } from "react";

import {
  parseManagedNewsEntry,
  type ManagedNewsEntry,
} from "@/lib/content/managed-news";

type ContentStatus = "draft" | "published" | "archived";

type EditorDraft = {
  entryId?: string;
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  paragraphs: string;
  publicationAt?: string;
};

const emptyDraft: EditorDraft = {
  slug: "",
  title: "",
  summary: "",
  eyebrow: "SESC news",
  paragraphs: "",
};

function messageFrom(body: unknown, fallback: string) {
  return body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
    ? (body as { message: string }).message
    : fallback;
}

function entryFrom(body: unknown): ManagedNewsEntry[] {
  if (!body || typeof body !== "object" || !Array.isArray((body as { entries?: unknown }).entries)) {
    return [];
  }

  return (body as { entries: unknown[] }).entries.flatMap((value) => {
    const entry = parseManagedNewsEntry(value);
    return entry ? [entry] : [];
  });
}

function draftFrom(entry: ManagedNewsEntry): EditorDraft {
  return {
    entryId: entry.id,
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    eyebrow: entry.body.eyebrow ?? "SESC news",
    paragraphs: entry.body.paragraphs.join("\n\n"),
    publicationAt: entry.publicationAt ?? undefined,
  };
}

function label(value: string) {
  return value.replaceAll("_", " ");
}

/**
 * A deliberately small news editor. It accepts text paragraphs only and
 * delegates every permission, transition, and audit decision to the protected
 * content route and database RPC.
 */
export function ContentManagementWorkspace() {
  const [entries, setEntries] = useState<ManagedNewsEntry[]>([]);
  const [draft, setDraft] = useState<EditorDraft>(emptyDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<ContentStatus | null>(null);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === draft.entryId) ?? null,
    [draft.entryId, entries],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/operations/content", { cache: "no-store" });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(messageFrom(body, "The content workspace is unavailable."));
        return;
      }
      setEntries(entryFrom(body));
      setMessage(null);
    } catch {
      setMessage("The content workspace is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  const update = (field: keyof EditorDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = async (status: ContentStatus) => {
    setMessage(null);

    const paragraphs = draft.paragraphs
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      setMessage("Add at least one plain-text paragraph before saving.");
      return;
    }

    setSaving(status);
    try {
      const response = await fetch("/api/operations/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entryId: draft.entryId,
          kind: "news",
          status,
          slug: draft.slug.trim(),
          title: draft.title.trim(),
          summary: draft.summary.trim(),
          body: {
            eyebrow: draft.eyebrow.trim() || undefined,
            paragraphs,
          },
          publicationAt: status === "published" ? draft.publicationAt : undefined,
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(messageFrom(body, "The content change could not be saved."));
        return;
      }

      const id = body && typeof body === "object" && typeof (body as { id?: unknown }).id === "string"
        ? (body as { id: string }).id
        : draft.entryId;
      setDraft((current) => ({ ...current, entryId: id }));
      await load();
      setMessage(status === "published"
        ? "Published. The article is now eligible for the public News page."
        : `Article ${label(status)}.`);
    } catch {
      setMessage("The content change could not be saved.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby="content-management-workspace-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Authorised publishing</p>
          <h2 className="text-xl font-extrabold text-white" id="content-management-workspace-title">News workspace</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#aebcb0]">Drafts and archived items are visible only through a service-authorised, audited worklist. Public visitors can read only published, currently valid articles through RLS.</p>
        </div>
        <button className="button button--secondary" disabled={loading || saving !== null} onClick={() => void load()} type="button">{loading ? "Loading…" : entries.length ? "Refresh worklist" : "Load worklist"}</button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(14rem,0.62fr)_minmax(0,1.38fr)]">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4">
          <div className="flex items-center justify-between gap-3"><h3 className="font-extrabold text-white">Managed articles</h3><button className="button button--ghost" disabled={saving !== null} onClick={() => setDraft(emptyDraft)} type="button">New article</button></div>
          {entries.length ? <ul className="mt-4 space-y-2" role="list">{entries.map((entry) => <li key={entry.id}><button aria-pressed={selectedEntry?.id === entry.id} className={`w-full rounded-lg border p-3 text-left transition ${selectedEntry?.id === entry.id ? "border-[#70db9d]/70 bg-[#008751]/10" : "border-white/[0.08] hover:border-white/[0.2]"}`} disabled={saving !== null} onClick={() => setDraft(draftFrom(entry))} type="button"><span className="block truncate font-bold text-white">{entry.title}</span><span className="mt-1 block text-xs text-[#aebcb0]">{entry.slug} · {label(entry.status)}</span></button></li>)}</ul> : <p className="mt-4 text-sm leading-6 text-[#aebcb0]">{loading ? "Loading authorised worklist…" : "Load the protected worklist to edit an existing article, or start a new one."}</p>}
        </div>

        <form className="form-grid" onSubmit={(event) => { event.preventDefault(); void save("draft"); }}>
          <div className="field full"><label htmlFor="managed-news-title">Headline</label><input disabled={saving !== null} id="managed-news-title" maxLength={220} onChange={(event) => update("title", event.target.value)} required value={draft.title} /></div>
          <div className="field"><label htmlFor="managed-news-slug">URL slug</label><input autoCapitalize="none" disabled={saving !== null} id="managed-news-slug" maxLength={160} onChange={(event) => update("slug", event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required value={draft.slug} /></div>
          <div className="field"><label htmlFor="managed-news-eyebrow">Section label</label><input disabled={saving !== null} id="managed-news-eyebrow" maxLength={80} onChange={(event) => update("eyebrow", event.target.value)} value={draft.eyebrow} /></div>
          <div className="field full"><label htmlFor="managed-news-summary">Summary</label><textarea disabled={saving !== null} id="managed-news-summary" maxLength={800} onChange={(event) => update("summary", event.target.value)} required rows={3} value={draft.summary} /></div>
          <div className="field full"><label htmlFor="managed-news-body">Article paragraphs</label><textarea aria-describedby="managed-news-body-note" disabled={saving !== null} id="managed-news-body" maxLength={24 * 2_000 + 200} onChange={(event) => update("paragraphs", event.target.value)} placeholder="Separate paragraphs with a blank line." required rows={10} value={draft.paragraphs} /><small id="managed-news-body-note">Plain text only. Markup, embeds, links, and raw HTML are not rendered by the public News page.</small></div>
          {message ? <p className="field-error full" role="status">{message}</p> : null}
          <div className="button-row full flex flex-wrap gap-2"><button className="button button--secondary" disabled={saving !== null} type="submit">{saving === "draft" ? "Saving…" : "Save draft"}</button><button className="button button--primary" disabled={saving !== null} onClick={() => void save("published")} type="button">{saving === "published" ? "Publishing…" : "Publish"}</button>{draft.entryId ? <button className="button button--ghost" disabled={saving !== null} onClick={() => void save("archived")} type="button">{saving === "archived" ? "Archiving…" : "Archive"}</button> : null}</div>
        </form>
      </div>
    </section>
  );
}
