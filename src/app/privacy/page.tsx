import { StandardPage } from "@/components/public-content";
import { createPageMetadata, getLegalDocument } from "@/data/site-content";

const privacyPolicy = getLegalDocument("privacy-policy");

export const metadata = createPageMetadata(privacyPolicy.title, privacyPolicy.summary);

export default function PrivacyPage() {
  return <StandardPage content={privacyPolicy} />;
}
