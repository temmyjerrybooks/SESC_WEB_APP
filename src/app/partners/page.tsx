import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import { TopsborgWebsiteLink } from "@/components/topsborg-website-link";
import { createPageMetadata, partners, partnersPage } from "@/data/site-content";

export const metadata = createPageMetadata(partnersPage.title, partnersPage.summary);

export default function PartnersPage() {
  return (
    <StandardPage content={partnersPage}>
      <section aria-labelledby="partner-directory-title" className="section section--tight">
        <SectionHeading
          copy="Only approved partners, categories and verified public destinations will appear in the published directory."
          id="partner-directory-title"
          title="Partner directory"
        />
        <div className="content-grid content-grid--two">
          {partners.map((partner) => (
            <ContentCard
              badge={partner.badge}
              eyebrow={partner.eyebrow}
              additionalAction={
                partner.slug === "topsborg-technologies" ? (
                  <TopsborgWebsiteLink className="card__link" showIcon>
                    Visit website
                  </TopsborgWebsiteLink>
                ) : null
              }
              href={
                partner.slug === "topsborg-technologies"
                  ? "/partners/topsborg-technologies"
                  : undefined
              }
              key={partner.slug}
              linkLabel="Learn about the partnership"
              summary={partner.summary}
              title={partner.title}
              visualLabel={partner.slug === "topsborg-technologies" ? "TECH" : "PARTNER"}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
