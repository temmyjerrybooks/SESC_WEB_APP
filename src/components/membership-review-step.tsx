"use client";

import { type Control, type FieldErrors, type UseFormRegister, useWatch } from "react-hook-form";
import { membershipCategories, type MembershipApplicationInput } from "@/lib/validation/membership";

export function MembershipReviewStep({
  category,
  control,
  errors,
  register,
}: {
  category: MembershipApplicationInput["membershipCategory"];
  control: Control<MembershipApplicationInput>;
  errors: FieldErrors<MembershipApplicationInput>;
  register: UseFormRegister<MembershipApplicationInput>;
}) {
  const [firstName, lastName, chapter, paymentReference] = useWatch({
    control,
    name: ["firstName", "lastName", "chapter", "paymentReference"],
  });

  return (
    <div className="review-step">
      <div className="review-step__summary">
        <h3>Review your application</h3>
        <dl>
          <div><dt>Name</dt><dd>{firstName} {lastName}</dd></div>
          <div><dt>Chapter preference</dt><dd>{chapter}</dd></div>
          <div><dt>Category</dt><dd>{membershipCategories.find((item) => item.value === category)?.label}</dd></div>
          <div><dt>Payment</dt><dd>Manual bank transfer · {paymentReference}</dd></div>
        </dl>
      </div>
      <label className="consent"><input type="checkbox" {...register("declaration")} /><span>I confirm that the information provided is accurate and understand that an application does not activate membership until it is reviewed and approved.</span></label>
      {errors.declaration?.message ? <span className="field-error" role="alert">{errors.declaration.message}</span> : null}
      <label className="consent"><input type="checkbox" {...register("marketingConsent")} /><span>I would like to receive optional club news and opportunities. I can change this later.</span></label>
    </div>
  );
}
