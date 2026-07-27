import { StandardPage } from "@/components/public-content";
import { createPageMetadata, getLegalDocument } from "@/data/site-content";

const accessibilityStatement = getLegalDocument("accessibility-statement");

export const metadata = createPageMetadata(accessibilityStatement.title, accessibilityStatement.summary);

export default function AccessibilityPage() {
  return <StandardPage content={accessibilityStatement} />;
}
