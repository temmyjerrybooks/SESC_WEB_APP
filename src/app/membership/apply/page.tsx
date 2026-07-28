import type { Metadata } from "next";
import { MembershipApplicationForm } from "@/components/membership-application-form";

export const metadata: Metadata = {
  title: "Membership application availability",
  description: "SESC membership application availability and data-protection notice.",
};

export default function MembershipApplyPage() {
  return (
    <section className="membership-application-page">
      <div className="page-shell membership-application-page__intro">
        <p className="eyebrow">Membership application</p>
        <h1>Secure applications will open with official instructions.</h1>
        <p>
          To protect supporters, this preview does not accept personal details, identity documents, payment references,
          or application files.
        </p>
      </div>
      <div className="page-shell">
        <MembershipApplicationForm />
      </div>
    </section>
  );
}
