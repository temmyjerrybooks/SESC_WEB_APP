import "server-only";

import { parseManagedNewsEntry } from "@/lib/content/managed-news";
import { createServiceRoleClient } from "@/lib/supabase/server";

import type { VerifiedActor } from "./actor";

function failed() {
  throw new Error("The authorised operation could not be completed.");
}

export async function updateOwnProfile(
  actor: VerifiedActor,
  input: {
    givenName?: string;
    familyName?: string;
    displayName?: string;
    phone?: string;
    countryCode?: string;
  },
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_update_member_profile", {
    p_actor_id: actor.id,
    p_given_name: input.givenName ?? null,
    p_family_name: input.familyName ?? null,
    p_display_name: input.displayName ?? null,
    p_phone: input.phone ?? null,
    p_country_code: input.countryCode?.toUpperCase() ?? null,
  });
  if (error || data !== true) failed();
}

export async function upsertContentEntry(
  actor: VerifiedActor,
  input: {
    entryId?: string;
    kind: string;
    status: string;
    slug: string;
    title: string;
    summary?: string;
    body: Record<string, unknown>;
    coverImagePath?: string;
    altText?: string;
    publicationAt?: string;
    expiresAt?: string;
  },
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_upsert_content_entry", {
    p_actor_id: actor.id,
    p_entry_id: input.entryId ?? null,
    p_kind: input.kind,
    p_status: input.status,
    p_slug: input.slug,
    p_title: input.title,
    p_summary: input.summary ?? null,
    p_body: input.body,
    p_cover_image_path: input.coverImagePath ?? null,
    p_alt_text: input.altText ?? null,
    p_publication_at: input.publicationAt ?? null,
    p_expires_at: input.expiresAt ?? null,
  });
  if (error || typeof data !== "string") failed();
  return data;
}

/**
 * Draft and archived content is never selected through browser RLS. The
 * service-only RPC repeats the content-type permission check before returning
 * the bounded management read model and writes an audit event for the read.
 */
export async function listManageableNewsEntries(actor: VerifiedActor) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc(
    "server_list_manageable_content_entries",
    { p_actor_id: actor.id, p_kind: "news" },
  );
  if (error || !Array.isArray(data)) failed();

  return (data as unknown[]).flatMap((row) => {
    const entry = parseManagedNewsEntry(row);
    return entry ? [entry] : [];
  });
}

export async function updateContactEnquiry(
  actor: VerifiedActor,
  input: {
    enquiryId: string;
    status: string;
    assignedTo?: string | null;
    resolutionNotes?: string | null;
  },
) {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("server_update_contact_enquiry", {
    p_actor_id: actor.id,
    p_enquiry_id: input.enquiryId,
    p_status: input.status,
    p_assigned_to: input.assignedTo ?? null,
    p_resolution_notes: input.resolutionNotes ?? null,
  });
  if (error || data !== true) failed();
}
