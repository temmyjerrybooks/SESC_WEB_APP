import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import {
  admitPublicWorkflowRequest,
} from "@/lib/public-workflows/handlers";
import { hashClientAddress, readClientAddress } from "@/lib/public-workflows/client-identity";
import { createPublicWorkflowRepository } from "@/lib/public-workflows/repository";
import { defaultTurnstileVerifier } from "@/lib/public-workflows/handlers";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { saveMembershipApplicationDraft, submitMembershipApplication } from "@/lib/server/membership-workflows";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { turnstileHostnameFromSiteUrl } from "@/lib/security/turnstile";
import { membershipRequestSchema } from "@/lib/validation/server-workflows";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const membershipRateLimit = { windowSeconds: 60 * 60, maxAttempts: 8 };

function publicUnavailable() {
  return unavailable(
    "Membership applications are not open yet. They remain unavailable until the protected production configuration has been verified.",
  );
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function ownedApplicationResponse(
  application: Record<string, unknown>,
  payment: Record<string, unknown> | null,
  documentRows: Array<Record<string, unknown>>,
) {
  const emergencyContact = application.emergency_contact;
  const contact = emergencyContact && typeof emergencyContact === "object"
    ? emergencyContact as Record<string, unknown>
    : {};

  return {
    application: {
      applicationId: application.id,
      referenceCode: application.reference_code,
      status: application.status,
      reviewNotes: stringValue(application.review_notes),
      chapterId: application.chapter_id,
      membershipPlanId: application.membership_plan_id,
      firstName: application.first_name,
      lastName: application.last_name,
      dateOfBirth: application.date_of_birth,
      phone: application.phone,
      address: application.address_line_1,
      city: application.city,
      countryCode: application.residence_country,
      emergencyContactName: stringValue(contact.name),
      emergencyContactPhone: stringValue(contact.phone),
      marketingConsent: Boolean(application.privacy_consent_at),
    },
    payment: payment
      ? {
          paymentId: payment.id,
          status: payment.status,
          reviewNotes: stringValue(payment.verification_notes),
        }
      : null,
    documents: documentRows.flatMap((document) => {
      const kind = document.document_kind;
      if (kind !== "profile_photo" && kind !== "identity_document") return [];
      if (document.status !== "pending" && document.status !== "verified") return [];
      return [{ kind }];
    }),
  };
}

export async function GET() {
  if (!isFeatureEnabled("membershipApplications")) {
    return publicUnavailable();
  }

  try {
    const actor = await requireVerifiedActor();
    const supabase = await createClient();
    const { data: application, error: applicationError } = await supabase
      .from("membership_applications")
      .select("id, reference_code, status, review_notes, chapter_id, membership_plan_id, first_name, last_name, date_of_birth, phone, address_line_1, city, residence_country, emergency_contact, privacy_consent_at")
      .eq("applicant_id", actor.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (applicationError) {
      return unavailable("Your protected application is temporarily unavailable.");
    }
    if (!application) {
      return noStoreJson({ application: null, payment: null, documents: [] });
    }

    const service = createServiceRoleClient();
    const [payment, documents] = await Promise.all([
      supabase
        .from("payments")
        .select("id, status, verification_notes")
        .eq("application_id", application.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      service.rpc("server_list_own_member_document_statuses", {
        p_actor_id: actor.id,
        p_application_id: application.id,
      }),
    ]);
    if (payment.error || documents.error) {
      return unavailable("Your protected application is temporarily unavailable.");
    }

    return noStoreJson(
      ownedApplicationResponse(
        application as Record<string, unknown>,
        payment.data as Record<string, unknown> | null,
        (documents.data ?? []) as Array<Record<string, unknown>>,
      ),
    );
  } catch (error) {
    return safeRequestError(error);
  }
}

export async function POST(request: NextRequest) {
  // Reject before reading any personal data while the secure workflow is off.
  if (!isFeatureEnabled("membershipApplications")) {
    return publicUnavailable();
  }

  const clientAddress = readClientAddress(
    request.headers,
    process.env.SESC_TRUSTED_PROXY_HEADERS === "true",
  );
  const sourceIpHash = clientAddress
    ? hashClientAddress("membership-application", clientAddress)
    : undefined;
  const repository = createPublicWorkflowRepository(createServiceRoleClient());
  const admission = await admitPublicWorkflowRequest(
    repository.rateLimiter,
    membershipRateLimit,
    "membership-application",
    sourceIpHash,
  );
  if (admission) {
    return noStoreJson(
      { message: admission.message },
      admission.status,
    );
  }

  try {
    const payload = membershipRequestSchema.safeParse(await request.json());
    if (!payload.success) {
      return noStoreJson({ message: "Please review the application details and try again." }, 400);
    }

    const actor = await requireVerifiedActor();
    if (payload.data.intent === "save") {
      const result = await saveMembershipApplicationDraft(actor, {
        chapterId: payload.data.chapterId,
        membershipPlanId: payload.data.membershipPlanId,
        payload: payload.data,
      });
      return noStoreJson({ application: result }, 201);
    }

    const challenge = await defaultTurnstileVerifier(
      payload.data.turnstileToken,
      process.env.TURNSTILE_SECRET_KEY,
      clientAddress,
      {
        expectedAction: "sesc_membership_submit",
        expectedHostname: turnstileHostnameFromSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
      },
    );
    if (challenge.status !== "passed") {
      return noStoreJson({ message: "We could not verify this submission. Please try again." }, 400);
    }

    const result = await submitMembershipApplication(
      actor,
      payload.data.applicationId,
      payload.data.marketingConsent,
    );
    return noStoreJson({ application: result }, 202);
  } catch (error) {
    return safeRequestError(error);
  }
}
