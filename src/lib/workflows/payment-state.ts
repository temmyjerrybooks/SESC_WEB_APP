import type { ApplicationStatus } from "./application-state";

export const paymentStatuses = [
  "pending_receipt",
  "pending_verification",
  "needs_resubmission",
  "approved",
  "rejected",
  "cancelled",
  "refunded",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];
export type PaymentActor = "applicant" | "finance_officer" | "system";

const applicantTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending_receipt: ["pending_verification"],
  pending_verification: [],
  needs_resubmission: ["pending_verification"],
  approved: [],
  rejected: [],
  cancelled: [],
  refunded: [],
};

const financeTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending_receipt: [],
  pending_verification: ["needs_resubmission", "approved", "rejected"],
  needs_resubmission: [],
  approved: [],
  rejected: [],
  cancelled: [],
  refunded: [],
};

export function canTransitionPayment(
  current: PaymentStatus,
  next: PaymentStatus,
  actor: PaymentActor,
): boolean {
  if (actor === "system") {
    return current !== next;
  }

  return (actor === "applicant" ? applicantTransitions : financeTransitions)[current].includes(next);
}

export function canActivateMembership(
  applicationStatus: ApplicationStatus,
  paymentStatus: PaymentStatus,
): boolean {
  return applicationStatus === "approved" && paymentStatus === "approved";
}
