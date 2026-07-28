import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  membershipBenefitCards,
  membershipBenefitsPage,
} from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(membershipBenefitsPage.title, membershipBenefitsPage.summary);

export default function MembershipBenefitsPage() {
  return (
    <StandardPage
      actions={[
        { href: "/membership/apply", label: "Application availability" },
        { href: "/membership/categories", label: "View categories", variant: "secondary" },
      ]}
      content={membershipBenefitsPage}
    >
      <section aria-labelledby="membership-benefits-title" className="section section--tight">
        <SectionHeading
          copy="These are platform and membership-experience themes, not a promise of benefits that have not been approved."
          id="membership-benefits-title"
          title="What a verified membership can support."
        />
        <div className="content-grid content-grid--four">
          {membershipBenefitCards.map((benefit) => (
            <ContentCard
              badge={benefit.badge}
              eyebrow={benefit.eyebrow}
              key={benefit.title}
              summary={benefit.summary}
              title={benefit.title}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
