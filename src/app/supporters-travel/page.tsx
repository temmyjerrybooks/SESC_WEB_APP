import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  supporterTravelCards,
  supportersTravelPage,
} from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(supportersTravelPage.title, supportersTravelPage.summary);

export default function SupportersTravelPage() {
  return (
    <StandardPage
      actions={[
        { href: "/match-centre/calendar", label: "View match calendar" },
        { href: "/membership", label: "Membership overview", variant: "secondary" },
      ]}
      content={supportersTravelPage}
    >
      <section aria-labelledby="travel-framework-title" className="section section--tight">
        <SectionHeading
          copy="Travel guidance will be published only with the correct match, provider and supporter-arrangement details."
          id="travel-framework-title"
          title="A safer way to coordinate."
        />
        <div className="content-grid content-grid--three">
          {supporterTravelCards.map((item) => (
            <ContentCard
              badge={item.badge}
              eyebrow={item.eyebrow}
              key={item.title}
              summary={item.summary}
              title={item.title}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
