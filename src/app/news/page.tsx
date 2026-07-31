import { DirectoryPage } from "@/components/public-content";
import { createPageMetadata, newsArticles, newsPage } from "@/data/site-content";
import { mergeManagedNewsWithFallback } from "@/lib/content/managed-news";
import { getPublishedManagedNews } from "@/lib/server/published-news";

export const metadata = createPageMetadata(newsPage.title, newsPage.summary);
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const managedNews = await getPublishedManagedNews();
  const entries = mergeManagedNewsWithFallback(managedNews, newsArticles);

  return (
    <DirectoryPage
      content={newsPage}
      entries={entries}
      hrefFor={(entry) => `/news/${entry.slug}`}
      linkLabel="Read article"
      sectionCopy="Published, currently valid articles appear here through the authorised content workflow. Reviewed development articles remain available as a fallback until replaced."
      sectionTitle="From the newsroom"
      visualLabel="NEWS"
    />
  );
}
