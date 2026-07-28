import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import { TopsborgWebsiteLink } from "@/components/topsborg-website-link";
import { siteConfig } from "@/config/site";
import { sponsorCards, sponsorsPage } from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(sponsorsPage.title, sponsorsPage.summary);

export default function SponsorsPage() {
  return (
    <StandardPage
      actions={[
        { href: "/partners", label: "Meet our partners" },
        {
          href: "/partners/sponsorship-opportunities",
          label: "Sponsorship opportunities",
          variant: "secondary",
        },
      ]}
      content={sponsorsPage}
    >
      <section aria-labelledby="sponsor-directory-title" className="section section--tight">
        <SectionHeading
          copy="Only relationships, descriptions, logo rights and links approved for public use should appear in this directory."
          id="sponsor-directory-title"
          title="A directory built for approved records."
        />
        <div className="content-grid content-grid--three">
          {sponsorCards.map((sponsor) => (
            <ContentCard
              badge={sponsor.badge}
              eyebrow={sponsor.eyebrow}
              additionalAction={
                sponsor.title === siteConfig.partners.topsborg.name ? (
                  <TopsborgWebsiteLink className="card__link" showIcon>
                    Visit website
                  </TopsborgWebsiteLink>
                ) : null
              }
              href={sponsor.href}
              key={sponsor.title}
              linkLabel={sponsor.linkLabel}
              summary={sponsor.summary}
              title={sponsor.title}
              visualLabel={sponsor.href ? "TECH" : "SPONSOR"}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
