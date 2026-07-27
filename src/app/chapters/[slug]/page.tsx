import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailPage } from "@/components/public-content";
import { chapters, createPageMetadata, findBySlug } from "@/data/site-content";

interface ChapterDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return chapters.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ChapterDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const chapter = findBySlug(chapters, slug);

  return createPageMetadata(
    chapter?.title ?? "Chapter profile",
    chapter?.summary ?? "A verified SESC chapter profile.",
  );
}

export default async function ChapterDetailPage({ params }: ChapterDetailPageProps) {
  const { slug } = await params;
  const chapter = findBySlug(chapters, slug);

  if (!chapter) {
    notFound();
  }

  return <DetailPage backHref="/chapters" backLabel="Back to chapters" entry={chapter} />;
}
