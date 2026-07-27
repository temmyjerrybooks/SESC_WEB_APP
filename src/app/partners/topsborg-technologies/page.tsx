import { DetailPage } from "@/components/public-content";
import { createPageMetadata, findBySlug, partners } from "@/data/site-content";

function getTopsborgPartnership() {
  const entry = findBySlug(partners, "topsborg-technologies");
  if (!entry) {
    throw new Error("TOPSBORG partnership content is required for this route.");
  }
  return entry;
}

const topsborgPartnership = getTopsborgPartnership();

export const metadata = createPageMetadata(topsborgPartnership.title, topsborgPartnership.summary);

export default function TopsborgTechnologiesPage() {
  return (
    <DetailPage
      backHref="/partners"
      backLabel="Back to partners"
      entry={topsborgPartnership}
    />
  );
}
