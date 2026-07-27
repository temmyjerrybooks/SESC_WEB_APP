import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import { createPageMetadata, legalDocuments, legalIndexPage } from "@/data/site-content";

export const metadata = createPageMetadata(legalIndexPage.title, legalIndexPage.summary);

export default function LegalIndexPage() {
  return (
    <StandardPage content={legalIndexPage}>
      <section aria-labelledby="legal-documents-title" className="section section--tight">
        <SectionHeading
          copy="Every document is currently a transparent development placeholder until approved copy is supplied."
          id="legal-documents-title"
          title="Document library"
        />
        <div className="content-grid content-grid--two">
          {legalDocuments.map((document) => (
            <ContentCard
              eyebrow={document.eyebrow}
              href={`/legal/${document.slug}`}
              key={document.slug}
              linkLabel="Read document status"
              summary={document.summary}
              title={document.title}
              visualLabel="LEGAL"
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
