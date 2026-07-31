import { NextRequest } from "next/server";

import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import {
  listManageableNewsEntries,
  upsertContentEntry,
} from "@/lib/server/administration-workflows";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { contentEntryRequestSchema } from "@/lib/validation/server-workflows";

function managementEnabled() {
  return isFeatureEnabled("adminPortal") || isFeatureEnabled("executivePortal");
}

/**
 * The editor worklist is intentionally limited to the news content type. Its
 * service-only RPC authorises the active actor before exposing drafts or
 * archived records; public RLS is never widened for this view.
 */
export async function GET() {
  if (!managementEnabled()) {
    return unavailable("Content management is not available in this environment.");
  }

  try {
    const actor = await requireVerifiedActor();
    const entries = await listManageableNewsEntries(actor);
    return noStoreJson({ entries });
  } catch (error) {
    return safeRequestError(error);
  }
}

export async function POST(request: NextRequest) {
  if (!managementEnabled()) {
    return unavailable("Content management is not available in this environment.");
  }
  try {
    const parsed = contentEntryRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return noStoreJson({ message: "The content entry is invalid." }, 400);
    }
    const actor = await requireVerifiedActor();
    const id = await upsertContentEntry(actor, parsed.data);
    return noStoreJson({ id }, parsed.data.entryId ? 200 : 201);
  } catch (error) {
    return safeRequestError(error);
  }
}
