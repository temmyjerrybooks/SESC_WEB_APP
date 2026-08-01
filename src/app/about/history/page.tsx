import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  clubHistoryMilestones,
  clubHistoryPage,
} from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(clubHistoryPage.title, clubHistoryPage.summary);

export default function ClubHistoryPage() {
  return (
    <StandardPage
      actions={[
        { href: "/about/mission-vision-values", label: "Mission, vision & values" },
        { href: "/leadership", label: "Explore leadership", variant: "secondary" },
      ]}
      content={clubHistoryPage}
    >
      <section aria-labelledby="history-framework-title" className="section section--tight">
        <SectionHeading
          copy="This editable framework keeps verified history separate from unconfirmed stories or dates."
          id="history-framework-title"
          title="A timeline built on trusted records."
        />
        <div className="content-grid content-grid--three">
          {clubHistoryMilestones.map((milestone) => (
            <ContentCard
              badge={milestone.badge}
              eyebrow={milestone.eyebrow}
              key={milestone.title}
              summary={milestone.summary}
              title={milestone.title}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
