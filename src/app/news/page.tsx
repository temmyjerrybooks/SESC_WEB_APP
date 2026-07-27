import { DirectoryPage } from "@/components/public-content";
import { createPageMetadata, newsArticles, newsPage } from "@/data/site-content";

export const metadata = createPageMetadata(newsPage.title, newsPage.summary);

export default function NewsPage() {
  return (
    <DirectoryPage
      content={newsPage}
      entries={newsArticles}
      hrefFor={(entry) => `/news/${entry.slug}`}
      linkLabel="Read article structure"
      sectionCopy="Approved articles will include attribution, publish status and accessible media."
      sectionTitle="From the newsroom"
      visualLabel="NEWS"
    />
  );
}
