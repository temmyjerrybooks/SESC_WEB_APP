import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import { aboutPage, clubValues, createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(aboutPage.title, aboutPage.summary);

export default function AboutPage() {
  return (
    <StandardPage
      actions={[
        { href: "/leadership", label: "Explore leadership" },
        { href: "/chapters", label: "Find a chapter", variant: "secondary" },
      ]}
      content={aboutPage}
    >
      <section aria-labelledby="club-values-title" className="section section--tight">
        <SectionHeading
          copy="These guiding themes are editable presentation content for the club's approved mission, vision and values."
          eyebrow="Club direction"
          id="club-values-title"
          title="Built around belonging and purpose."
        />
        <div className="content-grid content-grid--two">
          {clubValues.map((value) => (
            <ContentCard key={value.title} summary={value.summary} title={value.title} />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
