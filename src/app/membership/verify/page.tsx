import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export default function MembershipVerifyPage() {
  return (
    <section className="page-shell verification-page">
      <p className="eyebrow">Membership verification</p>
      <h1>Verification will protect member privacy when the secure service is ready.</h1>
      <p>
        Public verification will show only an approved membership status, name, category, and chapter after the secure
        membership service is connected.
      </p>
      <aside className="content-notice content-notice--confirmed" role="status">
        <ShieldCheck aria-hidden="true" size={18} />
        <div>
          <p className="content-notice__label">Secure verification service</p>
          <p>
            No live member records are available in this preview. Do not enter a membership number or personal details
            until SESC publishes the authorised verification route.
          </p>
        </div>
      </aside>
      <div className="action-row">
        <Link className="button button--primary" href="/membership">
          Explore membership <ArrowRight size={16} />
        </Link>
        <Link className="button button--secondary" href="/faq">
          Browse FAQs
        </Link>
      </div>
    </section>
  );
}
