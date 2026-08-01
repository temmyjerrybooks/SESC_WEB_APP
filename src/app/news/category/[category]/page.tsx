import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DirectoryPage } from "@/components/public-content";
import {
  getNewsCategory,
  newsCategories,
} from "@/data/additional-public-content";
import { createPageMetadata, newsArticles } from "@/data/site-content";

interface NewsCategoryPageProps {
  readonly params: Promise<{ category: string }>;
}

export function generateStaticParams() {
  return newsCategories.map(({ slug }) => ({ category: slug }));
}

export async function generateMetadata({ params }: NewsCategoryPageProps): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const category = getNewsCategory(categorySlug);

  return createPageMetadata(
    category?.title ?? "News category",
    category?.summary ?? "A filtered collection of SESC news and media content.",
  );
}

export default async function NewsCategoryPage({ params }: NewsCategoryPageProps) {
  const { category: categorySlug } = await params;
  const category = getNewsCategory(categorySlug);

  if (!category) {
    notFound();
  }

  const articles = newsArticles.filter((article) => category.articleSlugs.includes(article.slug));

  return (
    <DirectoryPage
      actions={[
        { href: "/news", label: "All news & media" },
        { href: "/community", label: "Community & CSR", variant: "secondary" },
      ]}
      content={category}
      entries={articles}
      hrefFor={(article) => `/news/${article.slug}`}
      linkLabel="Read article structure"
      sectionCopy="Articles remain clearly marked as demonstration content until an authorised editor publishes a verified update."
      sectionTitle="Articles in this category"
      visualLabel="NEWS"
    />
  );
}
