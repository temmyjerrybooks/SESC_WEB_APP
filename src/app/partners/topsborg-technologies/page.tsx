import { DetailPage } from "@/components/public-content";
import { TopsborgWebsiteLink } from "@/components/topsborg-website-link";
import { siteConfig } from "@/config/site";
import { createPageMetadata, findBySlug, partners } from "@/data/site-content";

function getTopsborgPartnership() {
  const entry = findBySlug(partners, "topsborg-technologies");
  if (!entry) {
    throw new Error("TOPSBORG partnership content is required for this route.");
  }
  return entry;
}

const topsborgPartnership = getTopsborgPartnership();

export const metadata = createPageMetadata(
  siteConfig.partners.topsborg.name + " - Official Technology Partner",
  "Learn about TOPSBORG Technologies Limited, the official technology implementation partner designing and developing the SESC digital platform under a Goods/Services Sponsorship Agreement.",
);

export default function TopsborgTechnologiesPage() {
  return (
    <DetailPage
      backHref="/partners"
      backLabel="Back to partners"
      entry={topsborgPartnership}
      heroSummaryContent={
        <>
          <TopsborgWebsiteLink>
            {siteConfig.partners.topsborg.name}
          </TopsborgWebsiteLink>{" "}
          is the official technology partner and technology implementation
          partner for the SESC digital platform under the stated{" "}
          {siteConfig.partners.topsborg.agreement}.
        </>
      }
      asideChildren={
        <div className="fact-card">
          <p className="fact-card__label">Official website</p>
          <TopsborgWebsiteLink className="fact-card__link" showIcon>
            {siteConfig.partners.topsborg.url.replace("https://", "")}
          </TopsborgWebsiteLink>
        </div>
      }
    >
      <section
        aria-labelledby="topsborg-partnership-purpose"
        className="topsborg-partnership-detail"
      >
        <h2 id="topsborg-partnership-purpose">
          A technology partnership for SESC&apos;s digital growth.
        </h2>
        <p>
          The partnership supports SESC&apos;s digital transformation through
          responsive public and portal experiences, clearer digital
          communication, and secure, scalable platform foundations.
        </p>
        <p>
          It is designed to enable future membership-management workflows and
          improve administrative efficiency as SESC approves and implements
          each protected service. SESC remains the host organisation and
          authority for its supporters&apos; community, data, and operations.
        </p>
        <TopsborgWebsiteLink className="button button--primary" showIcon>
          Visit {siteConfig.partners.topsborg.shortName}
        </TopsborgWebsiteLink>
      </section>
    </DetailPage>
  );
}
