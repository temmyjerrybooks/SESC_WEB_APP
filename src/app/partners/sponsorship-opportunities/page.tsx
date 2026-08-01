import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  sponsorshipOpportunitiesPage,
  sponsorshipOpportunityCards,
} from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(
  sponsorshipOpportunitiesPage.title,
  sponsorshipOpportunitiesPage.summary,
);

export default function SponsorshipOpportunitiesPage() {
  return (
    <StandardPage
      actions={[
        { href: "/sponsors", label: "View sponsors & partners" },
        { href: "/partners", label: "Partner directory", variant: "secondary" },
      ]}
      content={sponsorshipOpportunitiesPage}
    >
      <section aria-labelledby="sponsorship-framework-title" className="section section--tight">
        <SectionHeading
          copy="The framework below is deliberately not a live package list, rate card or invitation to transact."
          id="sponsorship-framework-title"
          title="Partnership areas ready for approval."
        />
        <div className="content-grid content-grid--three">
          {sponsorshipOpportunityCards.map((opportunity) => (
            <ContentCard
              badge={opportunity.badge}
              eyebrow={opportunity.eyebrow}
              key={opportunity.title}
              summary={opportunity.summary}
              title={opportunity.title}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
