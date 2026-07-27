import { StandardPage } from "@/components/public-content";
import { createPageMetadata, getLegalDocument } from "@/data/site-content";

const termsAndConditions = getLegalDocument("terms-and-conditions");

export const metadata = createPageMetadata(termsAndConditions.title, termsAndConditions.summary);

export default function TermsPage() {
  return <StandardPage content={termsAndConditions} />;
}
