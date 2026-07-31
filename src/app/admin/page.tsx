import type { Metadata } from "next";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleAlert,
  CreditCard,
  FileText,
  Landmark,
  MapPin,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  TicketCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { DashboardEyebrow, DashboardPanel, DashboardShell } from "@/components/dashboard-shell";
import { LiveAdminPortal } from "@/components/live-portals";
import { requirePortalAccess } from "@/lib/auth/portal-access";

export const metadata: Metadata = {
  title: "SESC Administration | Control Centre",
  description: "Development preview of the Super Eagles Supporters Club national administration dashboard.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type MetricProps = {
  label: string;
  value: string;
  note: string;
  signal: string;
  icon: LucideIcon;
  tone: "green" | "gold" | "red";
};

const metrics: MetricProps[] = [
  { label: "Registered members", value: "12,840", note: "Development sample", signal: "+12.6%", icon: Users, tone: "green" },
  { label: "Active chapters", value: "62", note: "6 awaiting review", signal: "6 pending", icon: Building2, tone: "gold" },
  { label: "Revenue records", value: "₦8.4m", note: "Illustrative YTD total", signal: "On track", icon: CreditCard, tone: "green" },
  { label: "Support queue", value: "24", note: "No live tickets loaded", signal: "Open", icon: MessageCircle, tone: "red" },
];

const reviewQueue = [
  { area: "Membership verification", count: "18", note: "Applications marked ready for review", icon: BadgeCheck, tone: "green" },
  { area: "Payment review", count: "9", note: "Manual-transfer receipts awaiting checks", icon: CreditCard, tone: "gold" },
  { area: "Chapter requests", count: "6", note: "New or amended chapter records", icon: Building2, tone: "green" },
  { area: "Support escalations", count: "4", note: "Requests awaiting an authorised response", icon: MessageCircle, tone: "red" },
];

const activities = [
  { title: "Monthly compliance report staged", description: "A development report record was added to the static activity feed.", time: "38 min ago", icon: FileText, tone: "green" },
  { title: "Gala programme draft updated", description: "Awards & Gala Night content is shown as a non-published sample.", time: "2 hrs ago", icon: TicketCheck, tone: "gold" },
  { title: "Chapter governance note added", description: "A representative governance update is awaiting production workflow setup.", time: "Yesterday", icon: Landmark, tone: "red" },
];

function AdminMetric({ label, value, note, signal, icon: Icon, tone }: MetricProps) {
  const styles = {
    green: "bg-[#008751]/15 text-[#70db9d]",
    gold: "bg-[#e9c349]/15 text-[#f5cf4c]",
    red: "bg-[#dd3234]/15 text-[#ffb3ad]",
  };

  return (
    <DashboardPanel className={`relative overflow-hidden p-5 sm:p-6 ${tone === "red" ? "border-l-4 border-l-[#dd3234]" : ""}`}>
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,transparent_60%,rgba(112,219,157,0.045)_60%,rgba(112,219,157,0.045)_65%,transparent_65%)]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${styles[tone]}`}><Icon aria-hidden="true" className="h-5 w-5" /></div>
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${styles[tone]}`}>{signal}</span>
      </div>
      <p className="relative mt-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#a5b4a7]">{label}</p>
      <p className="relative mt-1 text-4xl font-extrabold tracking-[-0.06em] text-white">{value}</p>
      <p className="relative mt-2 text-xs text-[#849388]">{note}</p>
    </DashboardPanel>
  );
}

function ChapterPulse() {
  const points = [
    { left: "19%", top: "22%", size: "h-3 w-3", tone: "bg-[#70db9d]" },
    { left: "46%", top: "55%", size: "h-4 w-4", tone: "bg-[#e9c349]" },
    { left: "72%", top: "34%", size: "h-3 w-3", tone: "bg-[#70db9d]" },
    { left: "78%", top: "73%", size: "h-2.5 w-2.5", tone: "bg-[#70db9d]" },
    { left: "31%", top: "77%", size: "h-2.5 w-2.5", tone: "bg-[#dd3234]" },
  ];

  return (
    <div aria-label="Illustrative chapter activity heatmap with five representative chapter points" className="relative min-h-64 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a130e] [background-image:radial-gradient(rgba(112,219,157,0.2)_1px,transparent_1px)] [background-size:18px_18px]" role="img">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(0,135,81,0.20),transparent_46%)]" />
      {points.map((point, index) => (
        <span className="absolute" key={`${point.left}-${point.top}`} style={{ left: point.left, top: point.top }}>
          {index === 1 ? <span aria-hidden="true" className="absolute -inset-2 animate-ping rounded-full bg-[#e9c349]/35 motion-reduce:animate-none" /> : null}
          <span aria-hidden="true" className={`relative block rounded-full border-2 border-[#0a130e] shadow-[0_0_13px_rgba(112,219,157,0.45)] ${point.size} ${point.tone}`} />
        </span>
      ))}
      <div className="absolute bottom-3 left-3 rounded-lg border border-white/[0.09] bg-[#101812]/90 px-3 py-2 text-xs font-semibold text-[#cbd8cd]">National activity sample</div>
    </div>
  );
}

export default async function AdminPage() {
  const access = await requirePortalAccess("administrator", "/admin");
  if (access.mode === "authenticated") {
    return <LiveAdminPortal userId={access.userId} />;
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <DashboardEyebrow>Super-administrator</DashboardEyebrow>
            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">Control centre</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#aebcb0] sm:text-base">A premium presentation layer for national operations. All figures are safe development samples, and management actions are intentionally unavailable.</p>
          </div>
          <button
            aria-describedby="admin-export-note"
            className="inline-flex min-h-11 w-fit cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#e9c349]/50 px-4 py-2.5 text-sm font-bold text-[#f5cf4c] opacity-65"
            disabled
            type="button"
          >
            <FileText aria-hidden="true" className="h-[18px] w-[18px]" /> Export report — demo
          </button>
        </header>
        <p className="-mt-4 text-xs text-[#839287]" id="admin-export-note">Exports require an authorised server-side report service.</p>

        <section aria-label="National dashboard summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <AdminMetric key={metric.label} {...metric} />)}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(17rem,0.8fr)]">
          <DashboardPanel className="p-5 sm:p-6" id="chapters">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl"><TrendingUp aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Membership growth</h2>
                <p className="mt-2 text-sm text-[#9eada0]">Illustrative national membership trend — not connected to production data.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#008751]/15 px-3 py-1.5 text-xs font-bold text-[#70db9d]"><ArrowUpRight aria-hidden="true" className="h-4 w-4" /> 12.6% sample growth</span>
            </div>
            <div className="mt-7 h-60 sm:h-72">
              <svg aria-labelledby="admin-growth-title admin-growth-description" className="h-full w-full overflow-visible" role="img" viewBox="0 0 720 300">
                <title id="admin-growth-title">Illustrative national membership growth</title>
                <desc id="admin-growth-description">A six-month static chart with steadily rising green bars and a gold trend line. It is development-only data.</desc>
                <defs>
                  <linearGradient id="admin-bar" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#008751" stopOpacity="0.95" /><stop offset="100%" stopColor="#008751" stopOpacity="0.15" /></linearGradient>
                  <linearGradient id="admin-bar-highlight" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#70db9d" stopOpacity="0.95" /><stop offset="100%" stopColor="#008751" stopOpacity="0.18" /></linearGradient>
                </defs>
                {[48, 103, 158, 213].map((y) => <line key={y} stroke="rgba(223,240,226,0.11)" strokeDasharray="4 8" x1="40" x2="705" y1={y} y2={y} />)}
                <text fill="#8fa090" fontSize="11" x="0" y="51">15k</text><text fill="#8fa090" fontSize="11" x="0" y="106">10k</text><text fill="#8fa090" fontSize="11" x="5" y="161">5k</text>
                <rect fill="url(#admin-bar)" height="102" rx="7" width="65" x="65" y="166" /><rect fill="url(#admin-bar)" height="118" rx="7" width="65" x="165" y="150" /><rect fill="url(#admin-bar)" height="137" rx="7" width="65" x="265" y="131" /><rect fill="url(#admin-bar)" height="128" rx="7" width="65" x="365" y="140" /><rect fill="url(#admin-bar)" height="164" rx="7" width="65" x="465" y="104" /><rect fill="url(#admin-bar-highlight)" height="188" rx="7" width="65" x="565" y="80" />
                <polyline fill="none" points="97,166 197,150 297,131 397,140 497,104 597,80" stroke="#e9c349" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                {[{ x: 97, y: 166 }, { x: 197, y: 150 }, { x: 297, y: 131 }, { x: 397, y: 140 }, { x: 497, y: 104 }, { x: 597, y: 80 }].map((point) => <circle cx={point.x} cy={point.y} fill="#e9c349" key={`${point.x}-${point.y}`} r="4.5" stroke="#101412" strokeWidth="3" />)}
                {[[88, "Jan"], [188, "Feb"], [288, "Mar"], [388, "Apr"], [488, "May"], [588, "Jun"]].map(([x, label]) => <text fill="#aebcb0" fontSize="12" key={label} textAnchor="middle" x={x} y="290">{label}</text>)}
              </svg>
            </div>
          </DashboardPanel>

          <DashboardPanel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.04em] text-white"><MapPin aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Chapter pulse</h2><p className="mt-2 text-sm text-[#9eada0]">Representative activity points</p></div><span className="rounded-full bg-[#e9c349]/10 px-2.5 py-1 text-xs font-bold text-[#f5cf4c]">Preview</span></div>
            <div className="mt-6"><ChapterPulse /></div>
          </DashboardPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(19rem,0.88fr)]">
          <div id="applications">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl">Verification and operations queue</h2><p className="mt-1 text-sm text-[#9eada0]">No workflow actions can alter records in this interface.</p></div><span className="inline-flex items-center gap-2 rounded-full bg-[#dd3234]/10 px-3 py-1.5 text-xs font-bold text-[#ffb3ad]"><Activity aria-hidden="true" className="h-4 w-4" /> Static worklist</span></div>
            <DashboardPanel className="divide-y divide-white/[0.08] overflow-hidden">
              {reviewQueue.map((item) => {
                const Icon = item.icon;
                const tone = item.tone === "gold" ? "bg-[#e9c349]/15 text-[#f5cf4c]" : item.tone === "red" ? "bg-[#dd3234]/15 text-[#ffb3ad]" : "bg-[#008751]/15 text-[#70db9d]";
                return (
                  <article className="grid gap-3 p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center" key={item.area}>
                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></div>
                    <div className="min-w-0"><h3 className="font-bold text-white">{item.area}</h3><p className="mt-1 text-sm leading-5 text-[#9eada0]">{item.note}</p></div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end"><span className="text-2xl font-extrabold tracking-[-0.04em] text-white">{item.count}</span><button aria-label={`Open ${item.area} is unavailable in this demo`} className="min-h-10 cursor-not-allowed rounded-xl border border-white/[0.14] px-3 py-2 text-xs font-bold text-[#cbd8cd] opacity-60" disabled type="button">Open — demo</button></div>
                  </article>
                );
              })}
            </DashboardPanel>
          </div>

          <div className="space-y-4">
            <DashboardPanel className="p-5 sm:p-6" id="governance">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#008751]/15 text-[#70db9d]"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></div><div><h2 className="font-extrabold text-white">Governance snapshot</h2><p className="text-sm text-[#9eada0]">Development-only signals</p></div></div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] p-4"><span className="text-sm font-semibold text-[#cbd7cd]">Role changes</span><span className="text-sm font-extrabold text-[#70db9d]">0 pending</span></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] p-4"><span className="text-sm font-semibold text-[#cbd7cd]">Policy reviews</span><span className="text-sm font-extrabold text-[#f5cf4c]">2 draft</span></div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] p-4"><span className="text-sm font-semibold text-[#cbd7cd]">Audit events</span><span className="text-sm font-extrabold text-[#e4eee5]">Preview only</span></div>
              </div>
              <button aria-describedby="governance-demo-note" className="mt-5 flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#008751] px-4 py-2.5 text-sm font-bold text-white opacity-60" disabled type="button">Review governance — demo <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
              <p className="mt-2 text-center text-xs text-[#8fa090]" id="governance-demo-note">Governance changes need permission and audit services.</p>
            </DashboardPanel>

            <DashboardPanel className="p-5 sm:p-6" id="security">
              <div className="flex gap-3"><ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#f5cf4c]" /><div><h2 className="font-extrabold text-white">Security posture placeholder</h2><p className="mt-1 text-sm leading-6 text-[#a6b5a8]">This UI does not grant administration rights. Production security requires authenticated server-side authorisation, RLS, audit logging, and rate limiting.</p></div></div>
            </DashboardPanel>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <DashboardPanel className="p-5 sm:p-6" id="content">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl"><BarChart3 aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Recent operational activity</h2><span className="text-xs font-bold uppercase tracking-[0.1em] text-[#70db9d]">Sample log</span></div>
            <div className="mt-6 space-y-5">
              {activities.map((activity) => {
                const Icon = activity.icon;
                const tone = activity.tone === "gold" ? "bg-[#e9c349]/15 text-[#f5cf4c]" : activity.tone === "red" ? "bg-[#dd3234]/15 text-[#ffb3ad]" : "bg-[#008751]/15 text-[#70db9d]";
                return <article className="flex gap-3" key={activity.title}><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"><h3 className="font-bold text-white">{activity.title}</h3><span className="text-xs font-semibold text-[#849388]">{activity.time}</span></div><p className="mt-1 text-sm leading-6 text-[#9eada0]">{activity.description}</p></div></article>;
              })}
            </div>
          </DashboardPanel>

          <DashboardPanel className="flex flex-col justify-between p-5 sm:p-6" id="payments">
            <div><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e9c349]/15 text-[#f5cf4c]"><CreditCard aria-hidden="true" className="h-5 w-5" /></div><h2 className="mt-5 text-xl font-extrabold tracking-[-0.04em] text-white">Payments &amp; finance</h2><p className="mt-3 text-sm leading-6 text-[#a6b5a8]">Manual-transfer review remains a display-only workflow until finance roles, receipt storage, and audit trails are configured.</p></div>
            <button aria-describedby="payment-demo-note" className="mt-6 flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#e9c349]/35 px-4 py-2.5 text-sm font-bold text-[#f5cf4c] opacity-60" disabled type="button">Payment records — demo <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
            <p className="mt-2 text-center text-xs text-[#8fa090]" id="payment-demo-note">No payment information is shown or stored here.</p>
          </DashboardPanel>
        </section>

        <DashboardPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" id="settings">
          <div className="flex gap-3"><CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#f5cf4c]" /><div><h2 className="font-bold text-white">Presentation route only</h2><p className="mt-1 text-sm leading-6 text-[#a6b5a8]">This route intentionally contains no credentials, privileged data, or management actions. Connect server-enforced RBAC before enabling controls.</p></div></div>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#70db9d]"><CheckCircle2 aria-hidden="true" className="h-5 w-5" /> Demo safeguards on</span>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
