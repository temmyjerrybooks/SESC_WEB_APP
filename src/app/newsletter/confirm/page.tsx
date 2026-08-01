import Link from "next/link";
import type { Metadata } from "next";

import { NewsletterConfirmationForm } from "@/components/newsletter-confirmation-form";
import { isFeatureEnabled } from "@/lib/environment/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm newsletter subscription | SESC",
  robots: { index: false, follow: false },
};

export default async function NewsletterConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validToken = Boolean(token && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token));

  if (!isFeatureEnabled("newsletterSubscriptions") || !validToken || !token) {
    return (
      <section className="section section--tight"><div className="page-shell">
        <div className="empty-state" role="status">
          <strong>This confirmation link is unavailable.</strong>
          <p>Newsletter enrolment is not currently available or the link is invalid.</p>
          <Link className="button button--ghost" href="/">Return home</Link>
        </div>
      </div></section>
    );
  }

  return <section className="section section--tight"><div className="page-shell" style={{ maxWidth: "42rem" }}><NewsletterConfirmationForm token={token} /></div></section>;
}
