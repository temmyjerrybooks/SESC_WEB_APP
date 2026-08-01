import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { LiveMembershipApplicationForm } from "@/components/live-membership-application-form";

/**
 * Membership storage, private uploads, payment verification, and reviewer
 * access must be configured together before this route can collect any
 * supporter information. Until then, rendering a form would encourage people
 * to submit personal data into a preview that cannot safely retain it.
 */
export function MembershipApplicationForm({
  enabled = false,
  turnstileSiteKey,
}: {
  enabled?: boolean;
  turnstileSiteKey?: string;
}) {
  if (enabled && turnstileSiteKey) {
    return (
      <section aria-labelledby="membership-application-title" className="form-card">
        <p className="eyebrow">Secure application</p>
        <h2 className="section-title" id="membership-application-title">
          Apply with protected storage and human review.
        </h2>
        <p className="page-summary">
          Required documents remain private. Do not upload payment credentials, card details, or documents belonging to another person.
        </p>
        <LiveMembershipApplicationForm siteKey={turnstileSiteKey} />
      </section>
    );
  }

  return (
    <section aria-labelledby="application-availability-title" className="application-unavailable">
      <span aria-hidden="true" className="application-unavailable__icon">
        <ShieldCheck size={32} />
      </span>
      <p className="eyebrow">Application availability</p>
      <h2 id="application-availability-title">Applications are being prepared for an approved launch.</h2>
      <p>
        This preview does not collect, save, or send personal details, identity documents, payment references, or
        application files. Please do not send those details through this site until SESC publishes an official opening
        notice and secure application instructions.
      </p>
      <div className="button-row">
        <Link className="button button--primary" href="/membership">
          Explore membership <ArrowRight size={16} />
        </Link>
        <Link className="button button--secondary" href="/membership/verify">
          Verify a membership
        </Link>
      </div>
    </section>
  );
}
