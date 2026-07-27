import { DirectoryPage } from "@/components/public-content";
import { createPageMetadata, matchCentrePage, matches } from "@/data/site-content";

export const metadata = createPageMetadata(matchCentrePage.title, matchCentrePage.summary);

export default function MatchCentrePage() {
  return (
    <DirectoryPage
      content={matchCentrePage}
      entries={matches}
      hrefFor={(entry) => `/match-centre/${entry.slug}`}
      linkLabel="Open match information"
      sectionCopy="Fixture and matchday records are intentionally labelled pending until official details are available."
      sectionTitle="Upcoming and matchday updates"
      visualLabel="MATCH"
    />
  );
}
