import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  clubDirectionCards,
  missionVisionValuesPage,
} from "@/data/additional-public-content";
import { clubValues, createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(
  missionVisionValuesPage.title,
  missionVisionValuesPage.summary,
);

export default function MissionVisionValuesPage() {
  return (
    <StandardPage
      actions={[
        { href: "/about/history", label: "Explore club history" },
        { href: "/membership", label: "Explore membership", variant: "secondary" },
      ]}
      content={missionVisionValuesPage}
    >
      <section aria-labelledby="club-direction-title" className="section section--tight">
        <SectionHeading
          copy="Mission and vision copy remains deliberately editable until the club approves its public wording."
          id="club-direction-title"
          title="A direction to formalise."
        />
        <div className="content-grid content-grid--two">
          {clubDirectionCards.map((item) => (
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
      <section aria-labelledby="club-values-title" className="section section--tight">
        <SectionHeading
          copy="These existing guiding themes are presentation content for the club's approved values."
          id="club-values-title"
          title="Values in practice."
        />
        <div className="content-grid content-grid--four">
          {clubValues.map((value) => (
            <ContentCard key={value.title} summary={value.summary} title={value.title} />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
