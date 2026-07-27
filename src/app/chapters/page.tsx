import { DirectoryPage } from "@/components/public-content";
import { chapters, chaptersPage, createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(chaptersPage.title, chaptersPage.summary);

export default function ChaptersPage() {
  return (
    <DirectoryPage
      content={chaptersPage}
      entries={chapters}
      hrefFor={(entry) => `/chapters/${entry.slug}`}
      linkLabel="View chapter template"
      sectionCopy="State and international records are shown only as editable demonstration templates until the club confirms public chapter information."
      sectionTitle="Chapter directory"
      visualLabel="CHAPTER"
    />
  );
}
