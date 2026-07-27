import { StandardPage } from "@/components/public-content";
import { createPageMetadata, getLegalDocument } from "@/data/site-content";

const cookiePolicy = getLegalDocument("cookie-policy");

export const metadata = createPageMetadata(cookiePolicy.title, cookiePolicy.summary);

export default function CookiesPage() {
  return <StandardPage content={cookiePolicy} />;
}
