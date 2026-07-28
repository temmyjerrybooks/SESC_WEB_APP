import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  MapPin,
  Medal,
  Megaphone,
  QrCode,
  Ticket,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { DashboardEyebrow, DashboardPanel, DashboardShell } from "@/components/dashboard-shell";
import { requirePortalAccess } from "@/lib/auth/portal-access";

export const metadata: Metadata = {
  title: "Member Portal | SESC",
  description: "Development preview of the Super Eagles Supporters Club member portal.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type MemberMetricProps = {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  tone: "green" | "gold" | "red";
};

const updates = [
  {
    category: "Team update",
    title: "Qualifiers briefing shared with registered supporters",
    time: "2 hours ago",
    icon: Trophy,
  },
  {
    category: "Member benefit",
    title: "Early-access supporters merchandise preview is now available",
    time: "Yesterday",
    icon: Medal,
  },
  {
    category: "Club notice",
    title: "Gala Night RSVP guidance has been added to your documents",
    time: "2 days ago",
    icon: ClipboardCheck,
  },
];

const memberMetrics: MemberMetricProps[] = [
  { label: "Matches attended", value: "14", note: "Since joining", icon: Ticket, tone: "green" },
  { label: "Years active", value: "5", note: "Member since 2021", icon: Medal, tone: "gold" },
  { label: "Chapter points", value: "850", note: "Lagos Mainland", icon: Trophy, tone: "red" },
];

function MemberMetric({ label, value, note, icon: Icon, tone }: MemberMetricProps) {
  const tones = {
    green: "bg-[#008751]/15 text-[#70db9d]",
    gold: "bg-[#e9c349]/15 text-[#f5cf4c]",
    red: "bg-[#dd3234]/15 text-[#ffb3ad]",
  };

  return (
    <DashboardPanel className="relative overflow-hidden p-5">
      <div aria-hidden="true" className="absolute -right-6 -top-6 h-24 w-24 rounded-full border-[14px] border-white/[0.035]" />
      <div className={`mb-6 grid h-11 w-11 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <p className="text-4xl font-extrabold tracking-[-0.055em] text-white sm:text-[2.55rem]">{value}</p>
      <p className="mt-1 text-sm font-bold text-[#e5ede6]">{label}</p>
      <p className="mt-1 text-xs text-[#97a69a]">{note}</p>
    </DashboardPanel>
  );
}

export default async function MemberPage() {
  await requirePortalAccess("member", "/member");
  return (
    <DashboardShell role="member">
      <div className="space-y-6 sm:space-y-8">
        <header className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <DashboardEyebrow>Member dashboard</DashboardEyebrow>
            <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
              Welcome back, <span className="text-[#70db9d]">Adaobi.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[#aebcb0] sm:text-base">
              Here is your development-preview membership snapshot. No profile, payment, or event information is connected yet.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e9c349]/30 bg-[#e9c349]/10 px-4 py-2 text-sm font-bold text-[#f5cf4c]">
            <Medal aria-hidden="true" className="h-[18px] w-[18px]" />
            Elite supporter
          </div>
        </header>

        <section aria-label="Membership overview" className="grid gap-4 xl:grid-cols-12">
          <article
            className="relative min-h-[22rem] overflow-hidden rounded-2xl border border-[#e9c349]/35 bg-[linear-gradient(135deg,#07160e_0%,#004d2c_55%,#073d2b_100%)] p-6 shadow-[0_22px_44px_rgba(0,0,0,0.24)] sm:p-7 xl:col-span-5"
            id="membership-card"
          >
            <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full border-[30px] border-[#70db9d]/10" />
            <div aria-hidden="true" className="absolute inset-0 opacity-40 [background-image:linear-gradient(135deg,transparent_0%,transparent_48%,rgba(255,255,255,0.06)_48%,rgba(255,255,255,0.06)_49%,transparent_49%,transparent_100%)] [background-size:22px_22px]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f7fbf8] text-[#008751] shadow-lg">
                    <Trophy aria-hidden="true" className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold tracking-[-0.04em] text-white">SESC</p>
                    <p className="text-xs font-bold text-[#f5cf4c]">NIGERIA</p>
                  </div>
                </div>
                <span className="rounded-md bg-[#e9c349] px-3 py-2 text-xs font-black tracking-[0.12em] text-[#261d00]">ELITE</span>
              </div>

              <div className="mt-auto flex items-end justify-between gap-4 pt-12">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#b9cbbd]">Development membership no.</p>
                  <p className="mt-2 font-mono text-xl font-bold tracking-[0.2em] text-white sm:text-2xl">DEV-SESC-0821</p>
                  <p className="mt-6 text-2xl font-extrabold uppercase tracking-[-0.025em] text-white sm:text-3xl">Adaobi M.</p>
                  <p className="mt-1 text-sm font-medium text-[#82e9ab]">Lagos Mainland Chapter</p>
                </div>
                <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-white p-2 text-[#101412] shadow-xl sm:h-24 sm:w-24">
                  <QrCode aria-label="Illustrative digital card verification code" className="h-full w-full" strokeWidth={1.75} />
                </div>
              </div>
            </div>
          </article>

          <div className="space-y-4 xl:col-span-7">
            <div className="grid gap-4 sm:grid-cols-3">
              {memberMetrics.map((metric) => (
                <MemberMetric key={metric.label} {...metric} />
              ))}
            </div>

            <DashboardPanel className="relative overflow-hidden" id="upcoming-events">
              <div aria-hidden="true" className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(circle_at_15%_50%,rgba(0,135,81,0.34),transparent_28%),linear-gradient(115deg,rgba(0,77,44,0.38),transparent_58%)]" />
              <div className="relative grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#70db9d]/30 bg-[#008751]/20 text-[#70db9d]">
                  <CalendarDays aria-hidden="true" className="h-7 w-7" />
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#dd3234]/90 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" />
                    Upcoming event
                  </div>
                  <p className="text-sm font-bold text-[#70db9d]">Supporters&apos; travel briefing</p>
                  <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.04em] text-white">Nigeria vs. Ghana</h2>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#b8c6b9]">
                    <span className="inline-flex items-center gap-1.5"><CalendarPlus aria-hidden="true" className="h-4 w-4 text-[#f5cf4c]" /> 14 October 2026</span>
                    <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 text-[#f5cf4c]" /> Lagos</span>
                  </div>
                </div>
                <div className="sm:justify-self-end">
                  <button
                    aria-describedby="member-event-demo-note"
                    className="min-h-11 cursor-not-allowed rounded-xl bg-[#008751] px-4 py-2.5 text-sm font-bold text-white opacity-65"
                    disabled
                    type="button"
                  >
                    Registration — demo
                  </button>
                  <p className="mt-2 max-w-[15rem] text-xs leading-5 text-[#95a59a]" id="member-event-demo-note">Registration becomes available when event services are connected.</p>
                </div>
              </div>
            </DashboardPanel>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div id="club-news">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.035em] text-white sm:text-2xl"><Megaphone aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Club news</h2>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#70db9d]">Preview only</span>
            </div>
            <DashboardPanel className="divide-y divide-white/[0.08] overflow-hidden">
              {updates.map((update) => {
                const Icon = update.icon;
                return (
                  <article className="flex gap-4 p-5" key={update.title}>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#008751]/15 text-[#70db9d]">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#f5cf4c]">{update.category}</p>
                      <h3 className="mt-1 text-sm font-bold leading-5 text-[#eff5f0] sm:text-base">{update.title}</h3>
                      <p className="mt-2 text-xs text-[#8fa090]">{update.time}</p>
                    </div>
                  </article>
                );
              })}
            </DashboardPanel>
          </div>

          <div id="chapter-updates">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-[-0.035em] text-white sm:text-2xl"><MapPin aria-hidden="true" className="h-5 w-5 text-[#70db9d]" /> Chapter updates</h2>
              <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#70db9d]">Lagos Mainland</span>
            </div>
            <DashboardPanel className="relative overflow-hidden p-5 sm:p-6">
              <div aria-hidden="true" className="absolute inset-0 opacity-50 [background-image:repeating-linear-gradient(-45deg,transparent,transparent_10px,rgba(255,255,255,0.025)_10px,rgba(255,255,255,0.025)_20px)]" />
              <div className="relative">
                <article className="border-b border-white/[0.09] pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">Lagos Mainland Watch Party</h3>
                    <span className="rounded-full bg-[#008751]/20 px-2.5 py-1 text-xs font-bold text-[#70db9d]">Today, 7 PM</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#a8b5aa]">Join fellow supporters for a pre-match briefing and fixture watch party. Capacity details are shown once event registration is connected.</p>
                </article>
                <article className="pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-white">Annual Chapter Meeting</h3>
                    <span className="rounded-full border border-white/[0.12] px-2.5 py-1 text-xs font-bold text-[#ccd7ce]">Saturday, 18 Oct</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#a8b5aa]">Planning for the end-of-year supporters&apos; gala and the next chapter programme.</p>
                </article>
                <button
                  aria-describedby="chapter-demo-note"
                  className="mt-6 flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#70db9d]/35 px-4 py-2.5 text-sm font-bold text-[#e7f3e9] opacity-65"
                  disabled
                  type="button"
                >
                  Chapter hub — demo <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
                <p className="mt-2 text-center text-xs text-[#8fa090]" id="chapter-demo-note">Chapter actions require a connected member account.</p>
              </div>
            </DashboardPanel>
          </div>
        </section>

        <DashboardPanel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" id="account-settings">
          <div className="flex gap-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#f5cf4c]" />
            <div>
              <h2 className="font-bold text-white">This is static development data</h2>
              <p className="mt-1 text-sm leading-6 text-[#a6b5a8]">The card, activity, chapter notices, and metrics are representative UI content. No real member record has been loaded.</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-bold text-[#70db9d]"><CheckCircle2 aria-hidden="true" className="h-5 w-5" /> Safe to explore</span>
        </DashboardPanel>
      </div>
    </DashboardShell>
  );
}
