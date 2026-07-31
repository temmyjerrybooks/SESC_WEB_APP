import type { Metadata } from "next";
import { MembershipApplicationForm } from "@/components/membership-application-form";
import { isFeatureEnabled } from "@/lib/environment/server";
import { readPublicEnvironment } from "@/lib/environment/public";

export const metadata: Metadata = {
  title: "Membership application availability",
  description: "SESC membership application availability and data-protection notice.",
};

export default function MembershipApplyPage() {
  const applicationsEnabled = isFeatureEnabled("membershipApplications");
  const turnstileSiteKey = readPublicEnvironment().turnstileSiteKey;

  return (
    <section className="membership-application-page">
      <div className="page-shell membership-application-page__intro">
        <p className="eyebrow">Membership application</p>
        <h1>
          {applicationsEnabled
            ? "Start your secure membership application."
            : "Secure applications will open with official instructions."}
        </h1>
        <p>
          {applicationsEnabled
            ? "Save your details to a protected draft, upload the two required private documents, and submit for authorised review. Membership is not active until that review is complete."
            : "To protect supporters, this preview does not accept personal details, identity documents, payment references, or application files."}
        </p>
      </div>
      <div className="page-shell">
        <MembershipApplicationForm
          enabled={applicationsEnabled}
          turnstileSiteKey={turnstileSiteKey}
        />
      </div>
    </section>
  );
}
