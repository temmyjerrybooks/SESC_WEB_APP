import { describe, expect, it } from "vitest";

import { canActivateMembership, canTransitionPayment } from "./payment-state";

describe("payment state machine", () => {
  it("does not permit browser-controlled approval", () => {
    expect(canTransitionPayment("pending_verification", "approved", "applicant")).toBe(false);
    expect(canTransitionPayment("pending_verification", "approved", "finance_officer")).toBe(true);
  });

  it("allows a correction receipt to re-enter verification", () => {
    expect(canTransitionPayment("needs_resubmission", "pending_verification", "applicant")).toBe(true);
    expect(canTransitionPayment("pending_verification", "needs_resubmission", "finance_officer")).toBe(true);
  });

  it("only activates after independently approved application and payment", () => {
    expect(canActivateMembership("approved", "approved")).toBe(true);
    expect(canActivateMembership("approved", "pending_verification")).toBe(false);
    expect(canActivateMembership("under_review", "approved")).toBe(false);
  });
});
