import { BadgeCheck, ClipboardCheck, FileText, ShieldCheck } from "lucide-react";

import { ContentManagementWorkspace } from "@/components/content-management-workspace";
import { DashboardEyebrow, DashboardPanel, DashboardShell } from "@/components/dashboard-shell";
import { ApplicationReviewWorkspace, PaymentReviewWorkspace } from "@/components/operations-review-workspace";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

function label(value: string | null | undefined, fallback = "Not available") {
  if (!value) return fallback;
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function date(value: string | null | undefined) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not available";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date(value));
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase() || "SE";
}

function Metric({ label: metricLabel, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <DashboardPanel className="p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#a5b4a7]">{metricLabel}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-xs text-[#849388]">{note}</p>
    </DashboardPanel>
  );
}

async function canManageNews(userId: string) {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service.rpc("actor_has_permission", {
      p_actor_id: userId,
      p_permission: "content.publish",
      p_chapter_id: null,
    });
    return !error && data === true;
  } catch {
    return false;
  }
}

/**
 * These components deliberately use the request-scoped Supabase client. They
 * are only mounted after requirePortalAccess has authenticated the request;
 * RLS still limits every query to records the signed-in actor may read.
 */
export async function LiveMemberPortal({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: profile }, { data: membership }, { data: application }, { count: unreadCount }] = await Promise.all([
    supabase.from("profiles").select("given_name, family_name, display_name, home_chapter_id").eq("id", userId).maybeSingle(),
    supabase.from("memberships").select("card_number, category_code, status, issue_date, expires_on, chapter_id").eq("member_id", userId).order("expires_on", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("membership_applications").select("reference_code, status, submitted_at, updated_at").eq("applicant_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
  ]);
  const chapterId = membership?.chapter_id ?? profile?.home_chapter_id;
  const { data: chapter } = chapterId
    ? await supabase.from("chapters").select("name, city, state_or_region").eq("id", chapterId).maybeSingle()
    : { data: null };
  const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") || profile?.display_name || "Member";

  return (
    <DashboardShell actorInitials={initials(fullName)} mode="live" role="member">
      <div className="space-y-6 sm:space-y-8">
        <header className="border-b border-white/[0.08] pb-6">
          <DashboardEyebrow>Member dashboard</DashboardEyebrow>
          <h1 className="text-balance text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">Welcome back, <span className="text-[#70db9d]">{fullName}.</span></h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#aebcb0]">This view is populated from your authorised membership records. Records not available to your account are not shown.</p>
        </header>

        <section aria-label="Membership overview" className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <DashboardPanel className="p-6" id="membership-card">
            <div className="flex items-start gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#008751]/15 text-[#70db9d]"><BadgeCheck aria-hidden="true" className="h-5 w-5" /></div><div><h2 className="text-xl font-extrabold text-white">Membership record</h2><p className="mt-1 text-sm text-[#9eada0]">{membership ? "Current record shown below." : "No membership record is available yet."}</p></div></div>
            {membership ? <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-[#8fa090]">Card number</dt><dd className="mt-1 font-mono font-bold text-white">{membership.card_number}</dd></div><div><dt className="text-[#8fa090]">Status</dt><dd className="mt-1 font-bold text-[#70db9d]">{label(membership.status)}</dd></div><div><dt className="text-[#8fa090]">Membership category</dt><dd className="mt-1 font-bold text-white">{label(membership.category_code)}</dd></div><div><dt className="text-[#8fa090]">Valid until</dt><dd className="mt-1 font-bold text-white">{date(membership.expires_on)}</dd></div><div><dt className="text-[#8fa090]">Chapter</dt><dd className="mt-1 font-bold text-white">{chapter?.name ?? "Not assigned"}</dd></div><div><dt className="text-[#8fa090]">Issued</dt><dd className="mt-1 font-bold text-white">{date(membership.issue_date)}</dd></div></dl> : <p className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 text-sm leading-6 text-[#b9c7bb]">Your account can access this portal, but there is no current membership card to display.</p>}
          </DashboardPanel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><Metric label="Unread notices" note="Your private notification queue" value={unreadCount ?? 0} /><Metric label="Home chapter" note={chapter?.city ?? "No chapter location recorded"} value={chapter?.name ?? "Not assigned"} /></div>
        </section>

        <DashboardPanel className="p-6" id="account-settings">
          <div className="flex items-start gap-3"><ClipboardCheck aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#f5cf4c]" /><div><h2 className="font-extrabold text-white">Membership application</h2><p className="mt-2 text-sm leading-6 text-[#aebcb0]">{application ? `${application.reference_code} is ${label(application.status).toLowerCase()}. Last updated ${date(application.updated_at ?? application.submitted_at)}.` : "There is no application record available to this account."}</p></div></div>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}

export async function LiveExecutivePortal({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: profile }, { data: applications }, { count: membershipCount }, mayManageNews] = await Promise.all([
    supabase.from("profiles").select("given_name, family_name, display_name").eq("id", userId).maybeSingle(),
    supabase.from("membership_applications").select("id, reference_code, status, created_at, updated_at").in("status", ["submitted", "under_review", "resubmitted"]).order("updated_at", { ascending: false }).limit(10),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
    canManageNews(userId),
  ]);
  const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") || profile?.display_name || "Executive";
  const reviewApplications = (applications ?? []).flatMap((application) => (
    typeof application.id === "string" && typeof application.reference_code === "string" && typeof application.status === "string"
      ? [{ applicationId: application.id, referenceCode: application.reference_code, status: application.status }]
      : []
  ));

  return (
    <DashboardShell actorInitials={initials(fullName)} mode="live" role="executive">
      <div className="space-y-6 sm:space-y-8">
        <header className="border-b border-white/[0.08] pb-6"><DashboardEyebrow>Chapter executive console</DashboardEyebrow><h1 className="text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">Operational workspace</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#aebcb0]">Your queue is constrained by server-side access checks and row-level security. Applicant PII is not rendered in this overview.</p></header>
        <section className="grid gap-4 sm:grid-cols-2"><Metric label="Applications requiring attention" note="Records visible within your authorised scope" value={applications?.length ?? 0} /><Metric label="Active memberships visible" note="RLS-scoped count only" value={membershipCount ?? 0} /></section>
        <DashboardPanel className="overflow-hidden" id="applications"><div className="border-b border-white/[0.08] p-5 sm:p-6"><div className="flex items-center gap-3"><ClipboardCheck aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /><div><h2 className="text-xl font-extrabold text-white">Review queue</h2><p className="mt-1 text-sm text-[#9eada0]">Reference-only list; protected workflow actions remain server-authorised.</p></div></div></div>{applications?.length ? <ul className="divide-y divide-white/[0.08]" role="list">{applications.map((application) => <li className="flex flex-wrap items-center justify-between gap-3 p-5" key={application.reference_code}><div><p className="font-mono text-sm font-bold text-white">{application.reference_code}</p><p className="mt-1 text-xs text-[#8fa090]">Updated {date(application.updated_at ?? application.created_at)}</p></div><span className="rounded-full bg-[#e9c349]/10 px-3 py-1 text-xs font-bold text-[#f5cf4c]">{label(application.status)}</span></li>)}</ul> : <p className="p-6 text-sm leading-6 text-[#aebcb0]">No applications requiring attention are visible in your current scope.</p>}</DashboardPanel>
        <DashboardPanel className="p-6"><ApplicationReviewWorkspace applications={reviewApplications} /></DashboardPanel>
        <DashboardPanel className="p-6"><PaymentReviewWorkspace /></DashboardPanel>
        {mayManageNews ? <DashboardPanel className="p-6" id="content"><ContentManagementWorkspace /></DashboardPanel> : null}
      </div>
    </DashboardShell>
  );
}

export async function LiveAdminPortal({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: profile }, { count: applicationCount }, { count: activeMembershipCount }, { count: activeChapterCount }, { count: publishedContentCount }, mayManageNews] = await Promise.all([
    supabase.from("profiles").select("given_name, family_name, display_name").eq("id", userId).maybeSingle(),
    supabase.from("membership_applications").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "resubmitted", "requires_correction"]),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("chapters").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("content_entries").select("id", { count: "exact", head: true }).eq("status", "published"),
    canManageNews(userId),
  ]);
  const fullName = [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") || profile?.display_name || "Administrator";

  return (
    <DashboardShell actorInitials={initials(fullName)} mode="live" role="admin">
      <div className="space-y-6 sm:space-y-8">
        <header className="border-b border-white/[0.08] pb-6"><DashboardEyebrow>National administration</DashboardEyebrow><h1 className="text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl">Control centre</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-[#aebcb0]">Live aggregate values are limited to records available under the authenticated session. Sensitive finance and contact data stays behind protected server workflows.</p></header>
        <section aria-label="Administration summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Review queue" note="Visible applications needing attention" value={applicationCount ?? 0} /><Metric label="Active memberships" note="RLS-scoped aggregate" value={activeMembershipCount ?? 0} /><Metric label="Active chapters" note="Public active directory count" value={activeChapterCount ?? 0} /><Metric label="Published content" note="Publicly visible entries" value={publishedContentCount ?? 0} /></section>
        <DashboardPanel className="p-6" id="security"><div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#70db9d]" /><div><h2 className="font-extrabold text-white">Protected administration workspace</h2><p className="mt-2 text-sm leading-6 text-[#aebcb0]">This overview is read-only. Profile changes, role assignments, payment reviews, contact handling, and publishing must use their server-authorised workflow endpoints so validation and audit logging are applied.</p></div></div></DashboardPanel>
        <DashboardPanel className="p-6" id="content">{mayManageNews ? <ContentManagementWorkspace /> : <div className="flex gap-3"><FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#f5cf4c]" /><div><h2 className="font-extrabold text-white">Content and operational records</h2><p className="mt-2 text-sm leading-6 text-[#aebcb0]">Content publishing is unavailable until its server-side permission check succeeds.</p></div></div>}</DashboardPanel>
      </div>
    </DashboardShell>
  );
}
