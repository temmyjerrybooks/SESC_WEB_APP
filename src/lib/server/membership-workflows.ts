import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/server";

import type { VerifiedActor } from "./actor";

function workflowFailure() {
  throw new Error("The secure workflow could not be completed.");
}

export async function saveMembershipApplicationDraft(
  actor: VerifiedActor,
  input: {
    chapterId: string;
    membershipPlanId: string;
    payload: Record<string, unknown>;
  },
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_save_membership_application_draft",
    {
      p_actor_id: actor.id,
      p_chapter_id: input.chapterId,
      p_membership_plan_id: input.membershipPlanId,
      p_payload: input.payload,
    },
  );

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || typeof row !== "object") {
    workflowFailure();
  }

  return row as {
    application_id: string;
    reference_code: string;
    status: string;
  };
}

export async function submitMembershipApplication(
  actor: VerifiedActor,
  applicationId: string,
  marketingConsent: boolean,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_submit_membership_application",
    {
      p_actor_id: actor.id,
      p_application_id: applicationId,
      p_marketing_consent: marketingConsent,
    },
  );

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || typeof row !== "object") {
    workflowFailure();
  }

  return row as {
    application_id: string;
    reference_code: string;
    status: string;
  };
}

export async function reviewMembershipApplication(
  actor: VerifiedActor,
  applicationId: string,
  decision: "under_review" | "requires_correction" | "approved" | "rejected",
  notes?: string,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_review_membership_application",
    {
      p_actor_id: actor.id,
      p_application_id: applicationId,
      p_decision: decision,
      p_notes: notes ?? null,
    },
  );
  if (error || typeof data !== "string") workflowFailure();
  return data;
}

export async function reviewManualPayment(
  actor: VerifiedActor,
  paymentId: string,
  decision: "approved" | "rejected" | "needs_resubmission",
  notes?: string,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_review_manual_payment",
    {
      p_actor_id: actor.id,
      p_payment_id: paymentId,
      p_decision: decision,
      p_notes: notes ?? null,
    },
  );
  if (error || typeof data !== "string") workflowFailure();
  return data;
}

export async function setMembershipStatus(
  actor: VerifiedActor,
  membershipId: string,
  status: "active" | "suspended",
  reason?: string,
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_set_membership_status",
    {
      p_actor_id: actor.id,
      p_membership_id: membershipId,
      p_status: status,
      p_reason: reason ?? null,
    },
  );
  if (error || typeof data !== "string") workflowFailure();
  return data;
}
