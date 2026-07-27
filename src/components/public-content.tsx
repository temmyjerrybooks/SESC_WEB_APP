import type { ReactNode } from "react";
import Link from "next/link";

import type {
  ContentFact,
  ContentNotice,
  DirectoryEntry,
  FaqEntry,
  PageContent,
  SearchEntry,
} from "@/data/site-content";

export interface PublicAction {
  readonly href: string;
  readonly label: string;
  readonly variant?: "primary" | "secondary" | "text";
}

interface PageHeroProps {
  readonly content: Pick<PageContent, "eyebrow" | "title" | "summary" | "notice">;
  readonly actions?: readonly PublicAction[];
  readonly children?: ReactNode;
}

export function PageHero({ content, actions, children }: PageHeroProps) {
  return (
    <header className="page-hero">
      <div className="page-shell page-hero__content">
        <p className="page-eyebrow">{content.eyebrow}</p>
        <h1 className="page-title">{content.title}</h1>
        <p className="page-summary">{content.summary}</p>
        {actions?.length ? <ActionLinks actions={actions} /> : null}
        {children}
      </div>
    </header>
  );
}

export function EditableContentNotice({ notice }: { readonly notice?: ContentNotice }) {
  if (!notice) {
    return null;
  }

  return (
    <aside className={`content-notice content-notice--${notice.tone}`} role="note">
      <p className="content-notice__label">{notice.label}</p>
      <p>{notice.copy}</p>
    </aside>
  );
}

export function ActionLinks({ actions }: { readonly actions: readonly PublicAction[] }) {
  return (
    <div className="action-row">
      {actions.map((action) => (
        <Link
          className={`button button--${action.variant ?? "primary"}`}
          href={action.href}
          key={`${action.href}-${action.label}`}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}

interface SectionHeadingProps {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly copy?: string;
  readonly action?: PublicAction;
}

export function SectionHeading({ id, eyebrow, title, copy, action }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
        <h2 className="section-title" id={id}>
          {title}
        </h2>
        {copy ? <p className="section-copy">{copy}</p> : null}
      </div>
      {action ? (
        <Link className="text-link" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

interface ContentCardProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly summary: string;
  readonly badge?: string;
  readonly href?: string;
  readonly linkLabel?: string;
  readonly visualLabel?: string;
}

export function ContentCard({
  eyebrow,
  title,
  summary,
  badge,
  href,
  linkLabel = "Explore",
  visualLabel,
}: ContentCardProps) {
  return (
    <article className="card">
      {visualLabel ? (
        <div aria-hidden="true" className="card__visual">
          <span>{visualLabel}</span>
        </div>
      ) : null}
      <div className="card__body">
        <div className="card__topline">
          {eyebrow ? <p className="card__eyebrow">{eyebrow}</p> : null}
          {badge ? <span className="card__badge">{badge}</span> : null}
        </div>
        <h3 className="card__title">{title}</h3>
        <p className="card__summary">{summary}</p>
        {href ? (
          <Link className="card__link" href={href}>
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

interface DirectoryGridProps {
  readonly entries: readonly DirectoryEntry[];
  readonly hrefFor: (entry: DirectoryEntry) => string;
  readonly linkLabel?: string;
  readonly visualLabel?: string;
  readonly className?: string;
}

export function DirectoryGrid({
  entries,
  hrefFor,
  linkLabel,
  visualLabel,
  className = "content-grid content-grid--three",
}: DirectoryGridProps) {
  return (
    <div className={className}>
      {entries.map((entry) => (
        <ContentCard
          badge={entry.badge}
          eyebrow={entry.eyebrow}
          href={hrefFor(entry)}
          key={entry.slug}
          linkLabel={linkLabel}
          summary={entry.summary}
          title={entry.title}
          visualLabel={visualLabel}
        />
      ))}
    </div>
  );
}

export function FactsGrid({ facts }: { readonly facts?: readonly ContentFact[] }) {
  if (!facts?.length) {
    return null;
  }

  return (
    <dl className="fact-grid">
      {facts.map((fact) => (
        <div className="fact-card" key={fact.label}>
          <dt className="fact-card__label">{fact.label}</dt>
          <dd className="fact-card__value">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface DetailPageProps {
  readonly entry: DirectoryEntry;
  readonly backHref: string;
  readonly backLabel: string;
  readonly children?: ReactNode;
}

export function DetailPage({ entry, backHref, backLabel, children }: DetailPageProps) {
  return (
    <main>
      <PageHero content={entry} />
      <section className="section">
        <div className="page-shell detail-layout">
          <div className="detail-layout__main">
            <EditableContentNotice notice={entry.notice} />
            <div className="article-copy">
              {entry.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {children}
            <Link className="route-back" href={backHref}>
              {backLabel}
            </Link>
          </div>
          <aside className="detail-layout__aside" aria-label="Content details">
            <FactsGrid facts={entry.facts} />
          </aside>
        </div>
      </section>
    </main>
  );
}

interface StandardPageProps {
  readonly content: PageContent;
  readonly actions?: readonly PublicAction[];
  readonly children?: ReactNode;
}

export function StandardPage({ content, actions, children }: StandardPageProps) {
  return (
    <main>
      <PageHero actions={actions} content={content} />
      <section className="section">
        <div className="page-shell article-layout">
          <EditableContentNotice notice={content.notice} />
          <div className="article-copy">
            {content.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

interface DirectoryPageProps {
  readonly content: PageContent;
  readonly entries: readonly DirectoryEntry[];
  readonly hrefFor: (entry: DirectoryEntry) => string;
  readonly sectionTitle: string;
  readonly sectionCopy?: string;
  readonly linkLabel?: string;
  readonly visualLabel?: string;
  readonly actions?: readonly PublicAction[];
}

export function DirectoryPage({
  content,
  entries,
  hrefFor,
  sectionTitle,
  sectionCopy,
  linkLabel,
  visualLabel,
  actions,
}: DirectoryPageProps) {
  return (
    <main>
      <PageHero actions={actions} content={content} />
      <section className="section">
        <div className="page-shell">
          <EditableContentNotice notice={content.notice} />
          {content.body.length ? (
            <div className="article-copy article-copy--intro">
              {content.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}
          <SectionHeading copy={sectionCopy} title={sectionTitle} />
          <DirectoryGrid
            entries={entries}
            hrefFor={hrefFor}
            linkLabel={linkLabel}
            visualLabel={visualLabel}
          />
        </div>
      </section>
    </main>
  );
}

export function EmptyState({
  title,
  copy,
  action,
}: {
  readonly title: string;
  readonly copy: string;
  readonly action?: PublicAction;
}) {
  return (
    <div className="empty-state">
      <h2 className="empty-state__title">{title}</h2>
      <p>{copy}</p>
      {action ? <ActionLinks actions={[action]} /> : null}
    </div>
  );
}

export function FaqList({ entries }: { readonly entries: readonly FaqEntry[] }) {
  return (
    <div className="faq-list">
      {entries.map((entry, index) => (
        <details className="faq-item" id={`question-${index + 1}`} key={entry.question}>
          <summary>{entry.question}</summary>
          <p>{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function SearchForm({ initialQuery = "" }: { readonly initialQuery?: string }) {
  return (
    <form action="/search" className="search-form" method="get" role="search">
      <label className="sr-only" htmlFor="site-search">
        Search SESC public content
      </label>
      <input
        className="search-input"
        defaultValue={initialQuery}
        id="site-search"
        name="q"
        placeholder="Search news, events, chapters and more"
        type="search"
      />
      <button className="button button--primary" type="submit">
        Search
      </button>
    </form>
  );
}

export function SearchResults({ results }: { readonly results: readonly SearchEntry[] }) {
  return (
    <div className="search-results" aria-live="polite">
      {results.map((result) => (
        <ContentCard
          badge={result.type}
          href={result.href}
          key={`${result.type}-${result.href}`}
          linkLabel="View result"
          summary={result.description}
          title={result.title}
        />
      ))}
    </div>
  );
}
