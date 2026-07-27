import { StandardPage } from "@/components/public-content";
import { contactPage, createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(contactPage.title, contactPage.summary);

export default function ContactPage() {
  return (
    <StandardPage
      actions={[{ href: "/faq", label: "Browse FAQs", variant: "secondary" }]}
      content={contactPage}
    />
  );
}
