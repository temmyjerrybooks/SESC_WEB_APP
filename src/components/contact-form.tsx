import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

/**
 * Rendering a data-entry form before contact delivery, retention, and support
 * ownership are ready would invite people to share personal information that
 * the preview cannot safely process.
 */
export function ContactForm() {
  return (
    <section aria-labelledby="contact-availability-title" className="form-card">
      <p className="eyebrow">Contact availability</p>
      <h2 className="section-title" id="contact-availability-title">
        Official contact channels are being prepared.
      </h2>
      <div className="empty-state" role="status">
        <ShieldCheck aria-hidden="true" size={22} />
        <p>
          This preview does not accept, send, or retain names, email addresses, messages, or supporting documents.
          Please wait for an authorised SESC contact announcement before sharing personal information.
        </p>
      </div>
      <div className="action-row" style={{ marginTop: "1.5rem" }}>
        <Link className="button button--primary" href="/faq">
          Browse FAQs <ArrowRight size={16} />
        </Link>
        <Link className="button button--secondary" href="/membership">
          Explore membership
        </Link>
      </div>
    </section>
  );
}
