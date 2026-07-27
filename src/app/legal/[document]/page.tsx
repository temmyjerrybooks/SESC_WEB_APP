import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StandardPage } from "@/components/public-content";
import { createPageMetadata, findBySlug, legalDocuments } from "@/data/site-content";

interface LegalDocumentPageProps {
  readonly params: Promise<{ document: string }>;
}

export function generateStaticParams() {
  return legalDocuments.map(({ slug }) => ({ document: slug }));
}

export async function generateMetadata({ params }: LegalDocumentPageProps): Promise<Metadata> {
  const { document } = await params;
  const legalDocument = findBySlug(legalDocuments, document);

  return createPageMetadata(
    legalDocument?.title ?? "Legal information",
    legalDocument?.summary ?? "Official SESC legal and accessibility information.",
  );
}

export default async function LegalDocumentPage({ params }: LegalDocumentPageProps) {
  const { document } = await params;
  const legalDocument = findBySlug(legalDocuments, document);

  if (!legalDocument) {
    notFound();
  }

  return <StandardPage content={legalDocument} />;
}
