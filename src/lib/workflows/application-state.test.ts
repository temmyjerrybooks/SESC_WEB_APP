import { describe, expect, it } from "vitest";

import { canApplicantEdit, canTransitionApplication, isOpenApplication } from "./application-state";

describe("application state machine", () => {
  it("allows an applicant to submit and resubmit only permitted states", () => {
    expect(canTransitionApplication("draft", "submitted", "applicant")).toBe(true);
    expect(canTransitionApplication("requires_correction", "resubmitted", "applicant")).toBe(true);
    expect(canTransitionApplication("submitted", "approved", "applicant")).toBe(false);
  });

  it("keeps approval and review transitions server-authorised", () => {
    expect(canTransitionApplication("submitted", "approved", "reviewer")).toBe(true);
    expect(canTransitionApplication("under_review", "requires_correction", "reviewer")).toBe(true);
    expect(canTransitionApplication("approved", "under_review", "administrator")).toBe(false);
  });

  it("identifies open applications and draft/correction edit windows", () => {
    expect(isOpenApplication("resubmitted")).toBe(true);
    expect(isOpenApplication("rejected")).toBe(false);
    expect(canApplicantEdit("draft")).toBe(true);
    expect(canApplicantEdit("requires_correction")).toBe(true);
    expect(canApplicantEdit("under_review")).toBe(false);
  });
});
