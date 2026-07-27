import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailPage } from "@/components/public-content";
import { createPageMetadata, findBySlug, leadershipProfiles } from "@/data/site-content";

interface LeadershipDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return leadershipProfiles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: LeadershipDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = findBySlug(leadershipProfiles, slug);

  return createPageMetadata(
    profile?.title ?? "Leadership profile",
    profile?.summary ?? "An approved public leadership profile from SESC.",
  );
}

export default async function LeadershipDetailPage({ params }: LeadershipDetailPageProps) {
  const { slug } = await params;
  const profile = findBySlug(leadershipProfiles, slug);

  if (!profile) {
    notFound();
  }

  return <DetailPage backHref="/leadership" backLabel="Back to leadership" entry={profile} />;
}
