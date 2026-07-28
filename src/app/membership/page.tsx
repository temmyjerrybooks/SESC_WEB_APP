import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, FileCheck2, ShieldCheck } from "lucide-react";

const stages = [
  ["01", "Prepare", "Watch for an authorised opening notice and the official membership terms."],
  ["02", "Apply", "When the protected application service launches, use only the published SESC route."],
  ["03", "Review", "Authorised membership and finance officers will assess the application and evidence."],
  ["04", "Activate", "Approved members can then receive a verified profile and digital membership card."],
] as const;

export default function MembershipPage() {
  return (
    <>
      <header className="page-hero">
        <div className="page-shell">
          <p className="page-eyebrow">Membership</p>
          <h1 className="page-title">Your place in the voice behind the Eagles.</h1>
          <p className="page-summary">
            A protected membership journey being prepared for official launch, with human review before a membership
            becomes active.
          </p>
          <div className="action-row">
            <Link className="button button--primary" href="/membership/apply">
              Check application availability <ArrowRight size={16} />
            </Link>
            <Link className="button button--secondary" href="/membership/verify">
              Verify a membership
            </Link>
          </div>
        </div>
      </header>
      <section className="section">
        <div className="page-shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow">How it will work</p>
              <h2>Verified with care, not shortcuts.</h2>
            </div>
          </div>
          <div className="membership-stages">
            {stages.map(([number, title, copy]) => (
              <article key={title}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section section--surface">
        <div className="membership-benefit-layout">
          <div>
            <p className="eyebrow">Designed for membership</p>
            <h2>One trusted profile for your supporter journey.</h2>
          </div>
          <div className="membership-benefits">
            {[
              [BadgeCheck, "Digital card", "A secure, public-safe verification card after approval."],
              [FileCheck2, "Application status", "A clear status timeline and correction requests where needed."],
              [CreditCard, "Payment history", "A protected record of approved payment evidence."],
              [ShieldCheck, "Privacy controls", "Controls for your account and notification preferences."],
            ].map(([Icon, title, copy]) => {
              const BenefitIcon = Icon as typeof BadgeCheck;
              return (
                <article key={String(title)}>
                  <BenefitIcon size={21} />
                  <h3>{String(title)}</h3>
                  <p>{String(copy)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
