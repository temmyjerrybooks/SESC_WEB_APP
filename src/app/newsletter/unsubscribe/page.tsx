import type { Metadata } from "next";

import { NewsletterUnsubscribeForm } from "@/components/newsletter-unsubscribe-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletter preferences | SESC",
  robots: { index: false, follow: false },
};

/**
 * Bearer tokens intentionally arrive in the URL fragment, which is invisible
 * to this server component. The client clears it before an explicit POST.
 */
export default function NewsletterUnsubscribePage() {
  return (
    <section className="section section--tight">
      <div className="page-shell" style={{ maxWidth: "42rem" }}>
        <NewsletterUnsubscribeForm />
      </div>
    </section>
  );
}
