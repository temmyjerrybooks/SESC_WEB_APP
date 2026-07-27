import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailPage } from "@/components/public-content";
import { createPageMetadata, findBySlug, newsArticles } from "@/data/site-content";

interface NewsArticlePageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return newsArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: NewsArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = findBySlug(newsArticles, slug);

  return createPageMetadata(
    article?.title ?? "News article",
    article?.summary ?? "A public SESC news article.",
  );
}

export default async function NewsArticlePage({ params }: NewsArticlePageProps) {
  const { slug } = await params;
  const article = findBySlug(newsArticles, slug);

  if (!article) {
    notFound();
  }

  return <DetailPage backHref="/news" backLabel="Back to News & Media" entry={article} />;
}
