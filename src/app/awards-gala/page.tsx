import { FactsGrid, SectionHeading, StandardPage } from "@/components/public-content";
import { awardsGalaPage, createPageMetadata, events, findBySlug } from "@/data/site-content";

const galaEvent = findBySlug(events, "awards-gala-night-2026");

export const metadata = createPageMetadata(awardsGalaPage.title, awardsGalaPage.summary);

export default function AwardsGalaPage() {
  return (
    <StandardPage
      actions={[
        { href: "/events/awards-gala-night-2026", label: "View event details" },
        { href: "/gallery/gala-archive-demo", label: "Explore gala gallery", variant: "secondary" },
      ]}
      content={awardsGalaPage}
    >
      <section aria-labelledby="gala-details-title" className="section section--tight">
        <SectionHeading
          copy="Practical event information is limited to the date and venue supplied for the initial platform brief."
          id="gala-details-title"
          title="At a glance"
        />
        <FactsGrid facts={galaEvent?.facts} />
      </section>
    </StandardPage>
  );
}
