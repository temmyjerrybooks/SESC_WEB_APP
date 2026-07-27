import { DirectoryPage } from "@/components/public-content";
import { createPageMetadata, galleryAlbums, galleryPage } from "@/data/site-content";

export const metadata = createPageMetadata(galleryPage.title, galleryPage.summary);

export default function GalleryPage() {
  return (
    <DirectoryPage
      content={galleryPage}
      entries={galleryAlbums}
      hrefFor={(entry) => `/gallery/${entry.slug}`}
      linkLabel="Open album structure"
      sectionCopy="Every future image will need approved usage rights, a meaningful caption and descriptive alt text."
      sectionTitle="Featured albums"
      visualLabel="GALLERY"
    />
  );
}
