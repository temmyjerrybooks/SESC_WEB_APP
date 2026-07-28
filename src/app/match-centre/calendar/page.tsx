import { DirectoryPage } from "@/components/public-content";
import { matchCalendarPage } from "@/data/additional-public-content";
import { createPageMetadata, matches } from "@/data/site-content";

export const metadata = createPageMetadata(matchCalendarPage.title, matchCalendarPage.summary);

export default function MatchCalendarPage() {
  return (
    <DirectoryPage
      actions={[
        { href: "/match-centre", label: "Open Match Centre" },
        { href: "/supporters-travel", label: "Supporters' travel", variant: "secondary" },
      ]}
      content={matchCalendarPage}
      entries={matches}
      hrefFor={(entry) => `/match-centre/${entry.slug}`}
      linkLabel="Open match information"
      sectionCopy="Dates and match details remain clearly labelled pending until official sources are available."
      sectionTitle="Fixture records and matchday guidance"
      visualLabel="CALENDAR"
    />
  );
}
