import { isFeatureEnabled } from "@/lib/environment/server";
import { requireVerifiedActor } from "@/lib/server/actor";
import { noStoreJson, safeRequestError, unavailable } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChapterOption = {
  id: string;
  name: string;
  city: string | null;
  stateOrRegion: string | null;
  countryCode: string;
};

type MembershipPlanOption = {
  id: string;
  name: string;
  description: string | null;
  amountMinor: number;
  currency: string;
  termMonths: number;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toChapterOptions(rows: unknown): ChapterOption[] {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const id = stringValue(record.id);
    const name = stringValue(record.name);
    const countryCode = stringValue(record.country_code);
    if (!id || !name || !countryCode) return [];

    return [{
      id,
      name,
      city: stringValue(record.city),
      stateOrRegion: stringValue(record.state_or_region),
      countryCode,
    }];
  });
}

function toPlanOptions(rows: unknown): MembershipPlanOption[] {
  if (!Array.isArray(rows)) return [];

  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const id = stringValue(record.id);
    const name = stringValue(record.name);
    const amountMinor = numberValue(record.amount_minor);
    const currency = stringValue(record.currency);
    const termMonths = numberValue(record.term_months);
    if (!id || !name || amountMinor === null || !currency || termMonths === null) return [];

    return [{
      id,
      name,
      description: stringValue(record.description),
      amountMinor,
      currency,
      termMonths,
    }];
  });
}

export async function GET() {
  if (!isFeatureEnabled("membershipApplications")) {
    return unavailable("Membership applications are not open yet.");
  }

  try {
    await requireVerifiedActor();
    const supabase = await createClient();
    const [chapters, plans] = await Promise.all([
      supabase
        .from("chapters")
        .select("id, name, city, state_or_region, country_code")
        .eq("status", "active")
        .order("name"),
      supabase
        .from("membership_plans")
        .select("id, name, description, amount_minor, currency, term_months")
        .eq("status", "active")
        .eq("is_public", true)
        .order("amount_minor"),
    ]);

    if (chapters.error || plans.error) {
      return unavailable("Membership application choices are temporarily unavailable.");
    }

    return noStoreJson({
      chapters: toChapterOptions(chapters.data),
      plans: toPlanOptions(plans.data),
    });
  } catch (error) {
    return safeRequestError(error);
  }
}
