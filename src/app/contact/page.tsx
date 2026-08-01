import { ContactForm } from "@/components/contact-form";
import { isFeatureEnabled } from "@/lib/environment/server";
import { readPublicEnvironment } from "@/lib/environment/public";
import { StandardPage } from "@/components/public-content";
import { contactPage, createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(contactPage.title, contactPage.summary);

export default function ContactPage() {
  const contactEnabled = isFeatureEnabled("contactEnquiries");
  const turnstileSiteKey = readPublicEnvironment().turnstileSiteKey;
  return (
    <StandardPage
      actions={[{ href: "/faq", label: "Browse FAQs", variant: "secondary" }]}
      content={contactPage}
    >
      <ContactForm enabled={contactEnabled} turnstileSiteKey={turnstileSiteKey} />
    </StandardPage>
  );
}
