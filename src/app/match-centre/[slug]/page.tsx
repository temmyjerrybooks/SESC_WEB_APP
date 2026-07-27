import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailPage } from "@/components/public-content";
import { createPageMetadata, findBySlug, matches } from "@/data/site-content";

interface MatchDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return matches.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: MatchDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const match = findBySlug(matches, slug);

  return createPageMetadata(
    match?.title ?? "Match Centre",
    match?.summary ?? "Verified SESC match information.",
  );
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { slug } = await params;
  const match = findBySlug(matches, slug);

  if (!match) {
    notFound();
  }

  return <DetailPage backHref="/match-centre" backLabel="Back to Match Centre" entry={match} />;
}
