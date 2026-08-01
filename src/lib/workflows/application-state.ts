export const applicationStatuses = [
  "draft",
  "submitted",
  "under_review",
  "requires_correction",
  "resubmitted",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];
export type ApplicationActor = "applicant" | "reviewer" | "administrator" | "system";

const applicantTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ["submitted", "withdrawn"],
  submitted: ["withdrawn"],
  under_review: ["withdrawn"],
  requires_correction: ["resubmitted", "withdrawn"],
  resubmitted: ["withdrawn"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

const reviewerTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: [],
  submitted: ["under_review", "requires_correction", "approved", "rejected"],
  under_review: ["requires_correction", "approved", "rejected"],
  requires_correction: [],
  resubmitted: ["under_review", "requires_correction", "approved", "rejected"],
  approved: [],
  rejected: [],
  withdrawn: [],
};

export function canTransitionApplication(
  current: ApplicationStatus,
  next: ApplicationStatus,
  actor: ApplicationActor,
): boolean {
  if (actor === "system") {
    return current !== next;
  }

  if (actor === "administrator") {
    return reviewerTransitions[current].includes(next);
  }

  return (actor === "applicant" ? applicantTransitions : reviewerTransitions)[current].includes(next);
}

export function isOpenApplication(status: ApplicationStatus): boolean {
  return !["approved", "rejected", "withdrawn"].includes(status);
}

export function canApplicantEdit(status: ApplicationStatus): boolean {
  return status === "draft" || status === "requires_correction";
}
