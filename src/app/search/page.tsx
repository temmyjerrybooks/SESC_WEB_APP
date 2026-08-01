import { EmptyState, PageHero, SearchForm, SearchResults, SectionHeading } from "@/components/public-content";
import { createPageMetadata, searchPage, searchPublicContent } from "@/data/site-content";

export const metadata = createPageMetadata(searchPage.title, searchPage.summary);

interface SearchPageProps {
  readonly searchParams: Promise<{ q?: string | string[] }>;
}

function readQuery(query: string | string[] | undefined): string {
  return Array.isArray(query) ? (query[0] ?? "") : (query ?? "");
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = readQuery(q).trim();
  const results = searchPublicContent(query);

  return (
    <div>
      <PageHero content={searchPage}>
        <SearchForm initialQuery={query} />
      </PageHero>
      <section className="section">
        <div className="page-shell">
          {query ? (
            <>
              <SectionHeading
                copy={`Showing ${results.length} public result${results.length === 1 ? "" : "s"} for “${query}”.`}
                title="Search results"
              />
              {results.length ? (
                <SearchResults results={results} />
              ) : (
                <EmptyState
                  action={{ href: "/faq", label: "Browse FAQs", variant: "secondary" }}
                  copy="Try a broader phrase or explore the main public sections. Only approved and development content in this platform is indexed."
                  title="No matching public content yet."
                />
              )}
            </>
          ) : (
            <EmptyState
              copy="Use a word or phrase to search public SESC pages, leadership, chapters, match information, news, events, galleries and partners."
              title="What would you like to find?"
            />
          )}
        </div>
      </section>
    </div>
  );
}
