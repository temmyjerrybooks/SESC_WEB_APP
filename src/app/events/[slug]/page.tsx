import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetailPage } from "@/components/public-content";
import { createPageMetadata, events, findBySlug } from "@/data/site-content";

interface EventDetailPageProps {
  readonly params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return events.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = findBySlug(events, slug);

  return createPageMetadata(
    event?.title ?? "SESC event",
    event?.summary ?? "Approved public SESC event information.",
  );
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params;
  const event = findBySlug(events, slug);

  if (!event) {
    notFound();
  }

  return <DetailPage backHref="/events" backLabel="Back to events" entry={event} />;
}
