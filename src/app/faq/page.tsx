import { FaqList, StandardPage } from "@/components/public-content";
import { createPageMetadata, faqPage, faqs } from "@/data/site-content";

export const metadata = createPageMetadata(faqPage.title, faqPage.summary);

export default function FaqPage() {
  return (
    <StandardPage content={faqPage}>
      <FaqList entries={faqs} />
    </StandardPage>
  );
}
