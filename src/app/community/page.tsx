import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  communityPage,
  communityPillars,
} from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(communityPage.title, communityPage.summary);

export default function CommunityPage() {
  return (
    <StandardPage
      actions={[
        { href: "/chapters", label: "Explore chapters" },
        { href: "/events", label: "View events", variant: "secondary" },
      ]}
      content={communityPage}
    >
      <section aria-labelledby="community-pillars-title" className="section section--tight">
        <SectionHeading
          copy="These pillars can guide future approved community and CSR content without claiming activity that has not been verified."
          id="community-pillars-title"
          title="Community, with care."
        />
        <div className="content-grid content-grid--three">
          {communityPillars.map((pillar) => (
            <ContentCard
              badge={pillar.badge}
              eyebrow={pillar.eyebrow}
              key={pillar.title}
              summary={pillar.summary}
              title={pillar.title}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
