# Content Management

## Current model

The controlled-release build has a narrowly scoped, persistent News workflow alongside the typed development content in [`src/data/site-content.ts`](../src/data/site-content.ts). The static articles remain a safe fallback if Supabase is not configured or has no matching managed article.

Authorised staff with the database-backed `content.publish` permission can use the live Executive or Admin workspace to create, edit, publish, archive, and list **News** articles. Every write passes through the server-authorised `server_upsert_content_entry` RPC; every staff worklist read passes through the service-only `server_list_manageable_content_entries` RPC and is audit logged. Browser roles do not receive a draft-content RLS policy.

The public `/news` index and `/news/[slug]` route use the request-scoped Supabase client, so the existing published-only RLS policy remains the data boundary. A record is rendered only when it is `published`, has reached its publication time, has not expired, and passes a second application-level parser. The renderer accepts text paragraphs only; it does not consume raw HTML, embeds, links, or arbitrary JSON.

This is not yet a general CMS, media library, review queue, scheduling service, or a replacement for editorial approval. The workspace intentionally supports News only for controlled testing.

## Editorial principle

Only approved SESC material may be published. Never invent names, biographies, dates, fixture details, official contacts, sponsor claims, contractual terms, external URLs, legal text, or image rights to fill a page. A transparent "awaiting confirmation" state is preferred to an unsupported fact.

## Current editorial workflow

1. An authorised editor supplies approved text, factual source, and a safe URL slug.
2. A staff account with `content.publish` saves a draft in the protected News workspace.
3. A second authorised reviewer verifies factual accuracy, publication permission, routes, metadata, and any media rights before the editor selects **Publish**.
4. The RPC records `content.published` or `content.saved`; protected worklist reads record `content.management_listed`.
5. Verify the article on `/news` and its `/news/[slug]` route in the same controlled preview before broad release.

The temporary typed content workflow remains appropriate for pages, events, sponsors, partnerships, galleries, and other content types until each receives its own reviewed server workflow and public renderer.

## CMS target model

When persistent content management is expanded, authorised users should be able to manage:

- Static pages, navigation, announcement bar, homepage sections, and SEO metadata.
- News, events, matches, gallery albums, leadership profiles, chapters, FAQs, sponsors, and partnerships.
- Awards and gala content, public contact details, social links, and legal pages.

Every publishable record should support these lifecycle states:

| State | Meaning | Public visibility |
| --- | --- | --- |
| Draft | Work in progress | No |
| Review | Awaiting authorised approval | No |
| Scheduled | Approved for future publication | No, until schedule is reached |
| Published | Approved live content | Yes |
| Archived | Retained history | No, unless an explicit public archive policy applies |

Records should retain author, last editor, review/publish timestamps, revision number, and an audit event. Scheduling must use a clear timezone and be processed by a reliable server-side job, not a browser timer.

## Content types and minimum fields

| Type | Minimum publication fields |
| --- | --- |
| Static page | Title, slug, summary/body, status, owner, SEO title/description, review date. |
| News | Headline, slug, summary/body, category, author/credit, publish date, status, hero image rights/alt text, SEO metadata. |
| Event/match | Title, confirmed date/time/timezone, venue or official status, organiser, public CTA, status, update history. |
| Leadership/chapter | Approved name/title/location, public bio/contact policy, status, source/approval date, portrait rights/alt text. |
| Gallery | Album title, captions, source/photographer credit, rights confirmation, meaningful alt text, status. |
| Sponsor/partner | Name, classification, approved description, logo rights, accessible logo label, website only if supplied/approved, status. |
| Legal page | Approved jurisdiction-specific text, owner, effective date, review date, version, publication approval. |

## Media rules

- Obtain the right to publish before upload. Record source, credit, licence/permission, and expiry where applicable.
- Provide meaningful alt text for informative images; use empty alt text only for genuinely decorative images.
- Preserve aspect ratio and use responsive, optimised sizes. Do not stretch partner logos.
- Keep member photos, identity documents, receipts, invitation lists, and other private records out of public CMS media.
- Use private Storage and short-lived signed URLs for sensitive media after server-side permission checks.
- Do not upload long-form video directly during the free-tier phase; use approved hosted embeds with captions/transcripts and fallbacks.

## Role separation

The target CMS needs least-privilege permissions. A content editor may prepare content, while publishing, legal, sponsorship, or system changes should require the relevant authorised role and possibly a separate approver. Role grants must be database-backed and scope-aware; UI visibility is not sufficient authorisation. See [RBAC](RBAC.md).

## Publication checklist

Before publishing any record, verify:

- Factual source and approval are recorded.
- Title, summary, slug, metadata, and social-preview content are correct.
- Dates, timezones, venues, contacts, prices, and links are confirmed.
- The page has a logical heading structure, working keyboard flow, useful alt text, and sufficient contrast.
- Media rights and attribution are complete.
- No private personal, payment, membership, security, or contractual information is exposed.
- The intended status is published, not accidentally scheduled/draft.

## Required content still awaiting official input

The club must provide or approve final public legal policies, contact routes, leadership/chapter details, social URLs, approved media/crest assets, official bank-transfer instructions, membership terms/categories, data-retention wording, and any partner URLs/company profiles before those items are published as facts.
