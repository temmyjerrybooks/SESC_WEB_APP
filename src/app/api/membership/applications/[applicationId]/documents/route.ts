import { createHash } from "node:crypto";

import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { admitPublicWorkflowRequest } from "@/lib/public-workflows/handlers";
import { createPublicWorkflowRepository } from "@/lib/public-workflows/repository";
import {
  completePrivateDocumentUpload,
  preparePrivateDocumentUpload,
} from "@/lib/server/private-documents";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { maximumPrivateUploadBytes } from "@/lib/storage/private-upload";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { privateDocumentRequestSchema } from "@/lib/validation/server-workflows";

function privateUploadsUnavailable() {
  return unavailable(
    "Private document upload is not available until protected storage has been verified.",
  );
}

const privateUploadRateLimit = { windowSeconds: 60 * 60, maxAttempts: 12 };
const maximumMultipartRequestBytes = maximumPrivateUploadBytes + 128 * 1024;

function actorUploadHash(actorId: string) {
  return createHash("sha256")
    .update(`sesc-private-upload:${actorId}`)
    .digest("hex");
}

function uploadFileFrom(form: FormData) {
  const file = form.get("file");
  return file && typeof file !== "string" && typeof file.arrayBuffer === "function"
    ? file
    : null;
}

function multipartRequestIsTooLarge(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;

  const parsed = Number(contentLength);
  return !Number.isSafeInteger(parsed) || parsed > maximumMultipartRequestBytes;
}

async function requireOwnedEditableApplication(
  actorId: string,
  applicationId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_applications")
    .select("id, applicant_id, status")
    .eq("id", applicationId)
    .maybeSingle();

  if (error || !data || data.applicant_id !== actorId) {
    throw new Error("The requested application is unavailable.");
  }

  if (data.status !== "draft" && data.status !== "requires_correction") {
    throw new Error("This application cannot accept additional documents.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  if (!isFeatureEnabled("privateDocumentUploads")) {
    return privateUploadsUnavailable();
  }

  try {
    const { applicationId } = await context.params;
    const actor = await requireVerifiedActor();
    const repository = createPublicWorkflowRepository(createServiceRoleClient());
    const admission = await admitPublicWorkflowRequest(
      repository.rateLimiter,
      privateUploadRateLimit,
      "private-document-upload",
      actorUploadHash(actor.id),
    );
    if (admission) return noStoreJson({ message: admission.message }, admission.status);

    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      if (multipartRequestIsTooLarge(request)) {
        return noStoreJson({ message: "The document upload exceeds the approved size limit." }, 413);
      }
      const form = await request.formData();
      const parsed = privateDocumentRequestSchema.safeParse({
        phase: form.get("phase"),
        applicationId: form.get("applicationId"),
        intentId: form.get("intentId"),
        kind: form.get("kind"),
      });
      const file = uploadFileFrom(form);
      if (!parsed.success || parsed.data.phase !== "upload" || parsed.data.applicationId !== applicationId || !file) {
        return noStoreJson({ message: "The document upload is invalid." }, 400);
      }
      await requireOwnedEditableApplication(actor.id, applicationId);
      const document = await completePrivateDocumentUpload({
        actorId: actor.id,
        applicationId,
        intentId: parsed.data.intentId,
        kind: parsed.data.kind,
        file,
      });
      return noStoreJson({ document }, 201);
    }

    const parsed = privateDocumentRequestSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.applicationId !== applicationId || parsed.data.phase !== "prepare") {
      return noStoreJson({ message: "The document request is invalid." }, 400);
    }
    await requireOwnedEditableApplication(actor.id, applicationId);

    const upload = await preparePrivateDocumentUpload({
      actorId: actor.id,
      applicationId,
      kind: parsed.data.kind,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
    });
    return noStoreJson({ upload }, 201);
  } catch (error) {
    return safeRequestError(error);
  }
}
