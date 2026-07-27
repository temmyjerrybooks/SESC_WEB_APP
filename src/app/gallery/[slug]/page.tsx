import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailPage, EmptyState } from "@/components/public-content";
import { createPageMetadata, findBySlug, galleryAlbums } from "@/data/site-content";

interface GalleryAlbumPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return galleryAlbums.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: GalleryAlbumPageProps): Promise<Metadata> {
  const { slug } = await params;
  const album = findBySlug(galleryAlbums, slug);

  return createPageMetadata(
    album?.title ?? "Gallery album",
    album?.summary ?? "An approved SESC gallery album.",
  );
}

export default async function GalleryAlbumPage({ params }: GalleryAlbumPageProps) {
  const { slug } = await params;
  const album = findBySlug(galleryAlbums, slug);

  if (!album) {
    notFound();
  }

  return (
    <DetailPage backHref="/gallery" backLabel="Back to Gallery" entry={album}>
      <EmptyState
        copy="Approved, rights-cleared images have not been uploaded for this demonstration album."
        title="The album is ready for approved media."
      />
    </DetailPage>
  );
}
