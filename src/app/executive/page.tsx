import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Megaphone,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { DashboardEyebrow, DashboardPanel, DashboardShell } from "@/components/dashboard-shell";
import { requirePortalAccess } from "@/lib/auth/portal-access";

export const metadata: Metadata = {
  title: "Chapter Executive Console | SESC",
  description: "Development preview of the Super Eagles Supporters Club chapter executive console.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type MetricProps = {
  label: string;
  value: string;
  trend: string;
  description: string;
  icon: LucideIcon;
  accent: "green" | "gold" | "red";
};

const metrics: MetricProps[] = [
  { label: "Active members", value: "1,284", trend: "+8.4%", description: "vs. previous period", icon: Users, accent: "green" },
  { label: "Applications to review", value: "7", trend: "Needs review", description: "within this chapter", icon: ClipboardCheck, accent: "gold" },
  { label: "Renewal health", value: "96%", trend: "On track", description: "current membership cycle", icon: UserCheck, accent: "green" },
  { label: "Chapter events", value: "4", trend: "This month", description: "draft and scheduled", icon: CalendarDays, accent: "red" },
];

const applications = [
  { name: "Kelechi A. (demo)", category: "Standard supporter", submitted: "Today, 09:42", status: "Documents ready" },
  { name: "Tomiwa O. (demo)", category: "Elite supporter", submitted: "Yesterday", status: "Payment pending" },
  { name: "Ifeanyi N. (demo)", category: "Standard supporter", submitted: "18 Jul 2026", status: "Chapter check" },
];

const activities = [
  { title: "Chapter report prepared", detail: "Monthly member engagement summary is ready for review.", time: "35 min ago", icon: FileText, tone: "green" },
  { title: "Watch party capacity updated", detail: "Capacity draft moved from 80 to 120 supporters.", time: "2 hrs ago", icon: CalendarDays, tone: "gold" },
  { title: "Membership renewal reminder staged", detail: "The draft audience contains 42 due members.", time: "Yesterday", icon: Megaphone, tone: "red" },
];

function ExecutiveMetric({ label, value, trend, description, icon: Icon, accent }: MetricProps) {
  const accentClass = {
    green: "bg-[#008751]/15 text-[#70db9d]",
    gold: "bg-[#e9c349]/15 text-[#f5cf4c]",
    red: "bg-[#dd3234]/15 text-[#ffb3ad]",
  };

  return (
    <DashboardPanel className="relative overflow-hidden p-5 sm:p-6">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${accentClass[accent]}`}>
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <span className={`rounded-md px-2 py-1 text-xs font-bold ${accentClass[accent]}`}>{trend}</span>
      </div>
      <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.1em] text-[#a5b4a7]">{label}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-[-0.06em] text-white">{value}</p>
      <p className="mt-2 text-xs text-[#849388]">{description}</p>
    </DashboardPanel>
  );
}

export default async function ExecutivePage() {
  await requirePortalAccess("executive", "/executive");
  return (
    <DashboardShell role="executive">
      <div className="space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <DashboardEyebrow>Chapter operations</DashboardEyebrow>
            <h1 className="text-balance text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">Lagos Mainland overview</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#aebcb0] sm:text-base">A static, development-safe view of chapter activity. Review, communications, payments, and exports remain disabled until authorised services are connected.</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#70db9d]/25 bg-[#008751]/10 px-4 py-2 text-sm font-bold text-[#70db9d]">
            <MapPin aria-hidden="true" className="h-[18px] w-[18px]" />
            Lagos Mainland · demo data
          </div>
        </header>

        <section aria-label="Chapter summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <ExecutiveMetric key={metric.label} {...metric} />)}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.8fr)]">
          <DashboardPanel className="p-5 sm:p-6" id="reports">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl"><TrendingUp aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Membership momentum</h2>
                <p className="mt-2 text-sm text-[#9eada0]">Illustrative chapter growth over the current six-month period.</p>
              </div>
              <span className="rounded-full bg-[#008751]/15 px-3 py-1.5 text-xs font-bold text-[#70db9d]">+8.4% development sample</span>
            </div>
            <div className="mt-7 h-60 min-w-0 sm:h-72">
              <svg aria-labelledby="growth-chart-title growth-chart-description" className="h-full w-full overflow-visible" role="img" viewBox="0 0 720 300">
                <title id="growth-chart-title">Illustrative membership growth chart</title>
                <desc id="growth-chart-description">Bars rise from January to June with a highlighted final month. This chart presents static development data only.</desc>
                <defs>
                  <linearGradient id="executive-bar" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#70db9d" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#008751" stopOpacity="0.18" />
                  </linearGradient>
                  <linearGradient id="executive-highlight" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e9c349" stopOpacity="0.92" />
                    <stop offset="100%" stopColor="#008751" stopOpacity="0.18" />
                  </linearGradient>
                </defs>
                {[48, 103, 158, 213].map((y) => <line key={y} stroke="rgba(223,240,226,0.11)" strokeDasharray="4 8" x1="38" x2="705" y1={y} y2={y} />)}
                <text fill="#8fa090" fontSize="11" x="0" y="51">1.5k</text>
                <text fill="#8fa090" fontSize="11" x="0" y="106">1.0k</text>
                <text fill="#8fa090" fontSize="11" x="0" y="161">0.5k</text>
                <rect fill="url(#executive-bar)" height="102" rx="7" width="65" x="65" y="166" />
                <rect fill="url(#executive-bar)" height="122" rx="7" width="65" x="165" y="146" />
                <rect fill="url(#executive-bar)" height="140" rx="7" width="65" x="265" y="128" />
                <rect fill="url(#executive-bar)" height="129" rx="7" width="65" x="365" y="139" />
                <rect fill="url(#executive-bar)" height="160" rx="7" width="65" x="465" y="108" />
                <rect fill="url(#executive-highlight)" height="187" rx="7" width="65" x="565" y="81" />
                <polyline fill="none" points="97,166 197,146 297,128 397,139 497,108 597,81" stroke="#e9c349" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                {[{ x: 97, y: 166 }, { x: 197, y: 146 }, { x: 297, y: 128 }, { x: 397, y: 139 }, { x: 497, y: 108 }, { x: 597, y: 81 }].map((point) => <circle cx={point.x} cy={point.y} fill="#e9c349" key={`${point.x}-${point.y}`} r="4.5" stroke="#101412" strokeWidth="3" />)}
                {[[88, "Jan"], [188, "Feb"], [288, "Mar"], [388, "Apr"], [488, "May"], [588, "Jun"]].map(([x, label]) => <text fill="#aebcb0" fontSize="12" key={label} textAnchor="middle" x={x} y="290">{label}</text>)}
              </svg>
            </div>
          </DashboardPanel>

          <DashboardPanel className="relative overflow-hidden p-5 sm:p-6" id="events">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_75%_22%,rgba(0,135,81,0.28),transparent_28%)]" />
            <div className="relative">
              <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl"><CalendarDays aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Upcoming programme</h2>
              <p className="mt-2 text-sm leading-6 text-[#a4b3a6]">Dates are development content and not live chapter commitments.</p>
              <ol className="mt-6 space-y-4 border-l border-[#70db9d]/25 pl-5">
                <li className="relative"><span aria-hidden="true" className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full bg-[#70db9d] ring-4 ring-[#111813]" /><p className="text-xs font-bold text-[#70db9d]">14 OCT · 18:30</p><p className="mt-1 font-bold text-white">Supporters&apos; travel briefing</p><p className="mt-1 text-sm text-[#9eada0]">Digital notice draft</p></li>
                <li className="relative"><span aria-hidden="true" className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full bg-[#e9c349] ring-4 ring-[#111813]" /><p className="text-xs font-bold text-[#f5cf4c]">18 OCT · 11:00</p><p className="mt-1 font-bold text-white">Annual chapter meeting</p><p className="mt-1 text-sm text-[#9eada0]">Agenda awaiting approval</p></li>
                <li className="relative"><span aria-hidden="true" className="absolute -left-[1.85rem] top-1.5 h-3 w-3 rounded-full bg-[#dd3234] ring-4 ring-[#111813]" /><p className="text-xs font-bold text-[#ffb3ad]">30 OCT · 19:00</p><p className="mt-1 font-bold text-white">Awards &amp; Gala Night</p><p className="mt-1 text-sm text-[#9eada0]">National event preview</p></li>
              </ol>
            </div>
          </DashboardPanel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.9fr)]">
          <div id="applications">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-[-0.04em] text-white sm:text-2xl">Applications waiting for chapter review</h2>
                <p className="mt-1 text-sm text-[#9eada0]">Representative rows only — no applicant records are loaded.</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e9c349]/10 px-3 py-1.5 text-xs font-bold text-[#f5cf4c]"><Clock3 aria-hidden="true" className="h-4 w-4" /> 7 in demo queue</span>
            </div>
            <DashboardPanel className="overflow-hidden">
              <div className="divide-y divide-white/[0.08]">
                {applications.map((application) => (
                  <article className="grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={application.name}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h3 className="font-bold text-white">{application.name}</h3>
                        <span className="rounded-full border border-white/[0.12] px-2 py-0.5 text-xs font-semibold text-[#bdcabf]">{application.category}</span>
                      </div>
                      <p className="mt-2 text-sm text-[#9eada0]">Submitted {application.submitted} · <span className="text-[#70db9d]">{application.status}</span></p>
                    </div>
                    <button
                      aria-label={`Review ${application.name} is unavailable in this demo`}
                      className="min-h-10 w-full cursor-not-allowed rounded-xl border border-[#70db9d]/30 px-4 py-2 text-sm font-bold text-[#d7e5d9] opacity-60 sm:w-auto"
                      disabled
                      type="button"
                    >
                      Review — demo
                    </button>
                  </article>
                ))}
              </div>
            </DashboardPanel>
          </div>

          <div className="space-y-4" id="members">
            <DashboardPanel className="p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#008751]/15 text-[#70db9d]"><ShieldCheck aria-hidden="true" className="h-5 w-5" /></div><div><h2 className="font-extrabold text-white">Member care</h2><p className="text-sm text-[#9eada0]">Chapter service snapshot</p></div></div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.035] p-4"><p className="text-2xl font-extrabold text-white">42</p><p className="mt-1 text-xs font-semibold text-[#9eada0]">Renewals due</p></div>
                <div className="rounded-xl bg-white/[0.035] p-4"><p className="text-2xl font-extrabold text-white">16</p><p className="mt-1 text-xs font-semibold text-[#9eada0]">Support replies</p></div>
              </div>
              <button aria-describedby="member-care-demo-note" className="mt-5 flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#008751] px-4 py-2.5 text-sm font-bold text-white opacity-60" disabled type="button">Member directory — demo <ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
              <p className="mt-2 text-center text-xs text-[#8fa090]" id="member-care-demo-note">Directory access requires an authorised chapter assignment.</p>
            </DashboardPanel>

            <DashboardPanel className="p-5 sm:p-6" id="announcements">
              <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-extrabold text-white"><Megaphone aria-hidden="true" className="h-5 w-5 text-[#f5cf4c]" /> Operational activity</h2><span className="text-xs font-bold uppercase tracking-[0.1em] text-[#70db9d]">Preview</span></div>
              <div className="mt-5 space-y-5">
                {activities.map((activity) => {
                  const Icon = activity.icon;
                  const iconTone = activity.tone === "gold" ? "bg-[#e9c349]/15 text-[#f5cf4c]" : activity.tone === "red" ? "bg-[#dd3234]/15 text-[#ffb3ad]" : "bg-[#008751]/15 text-[#70db9d]";
                  return <article className="flex gap-3" key={activity.title}><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconTone}`}><Icon aria-hidden="true" className="h-4 w-4" /></div><div className="min-w-0"><h3 className="text-sm font-bold text-[#ecf4ed]">{activity.title}</h3><p className="mt-1 text-xs leading-5 text-[#9eada0]">{activity.detail}</p><p className="mt-1.5 text-xs font-semibold text-[#7e8f81]">{activity.time}</p></div></article>;
                })}
              </div>
            </DashboardPanel>
          </div>
        </section>

        <DashboardPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" id="settings">
          <div className="flex gap-3"><CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#f5cf4c]" /><div><h2 className="font-bold text-white">Role controls are not enabled in this preview</h2><p className="mt-1 text-sm leading-6 text-[#a6b5a8]">Chapter statistics, activity, and queues are simulated. A production console must validate scope and permissions on the server.</p></div></div>
          <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#70db9d]"><CheckCircle2 aria-hidden="true" className="h-5 w-5" /> Safe demo mode</span>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
