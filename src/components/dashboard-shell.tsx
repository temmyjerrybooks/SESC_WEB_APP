"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  CreditCard,
  Crown,
  FileDown,
  Landmark,
  LayoutDashboard,
  LineChart,
  Lock,
  Map,
  Megaphone,
  Menu,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { TopsborgWebsiteLink } from "@/components/topsborg-website-link";

export type DashboardRole = "member" | "executive" | "admin";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

type DashboardConfig = {
  name: string;
  eyebrow: string;
  context: string;
  initials: string;
  actionLabel: string;
  actionHint: string;
  navItems: NavItem[];
};

const dashboardConfigs: Record<DashboardRole, DashboardConfig> = {
  member: {
    name: "Member Portal",
    eyebrow: "Elite supporter",
    context: "Personal membership workspace",
    initials: "AM",
    actionLabel: "Upgrade tier — demo",
    actionHint: "Membership upgrades are unavailable in this development preview.",
    navItems: [
      { label: "Overview", href: "/member", icon: LayoutDashboard },
      { label: "Membership card", href: "/member#membership-card", icon: BadgeCheck },
      { label: "Club news", href: "/member#club-news", icon: Star },
      { label: "My chapter", href: "/member#chapter-updates", icon: Map },
      { label: "Events", href: "/member#upcoming-events", icon: CalendarDays },
      { label: "Settings", href: "/member#account-settings", icon: Settings },
    ],
  },
  executive: {
    name: "Chapter Console",
    eyebrow: "Lagos Mainland",
    context: "Chapter operations workspace",
    initials: "LM",
    actionLabel: "New announcement — demo",
    actionHint: "Publishing announcements is unavailable in this development preview.",
    navItems: [
      { label: "Overview", href: "/executive", icon: LayoutDashboard },
      { label: "Applications", href: "/executive#applications", icon: ClipboardCheck, badge: "7" },
      { label: "Members", href: "/executive#members", icon: Users },
      { label: "Events", href: "/executive#events", icon: CalendarDays },
      { label: "Reports", href: "/executive#reports", icon: BarChart3 },
      { label: "Announcements", href: "/executive#announcements", icon: Megaphone },
      { label: "Settings", href: "/executive#settings", icon: Settings },
    ],
  },
  admin: {
    name: "SESC Admin",
    eyebrow: "National operations",
    context: "Super-administrator workspace",
    initials: "SA",
    actionLabel: "Export report — demo",
    actionHint: "Exports are unavailable until an authorised data service is connected.",
    navItems: [
      { label: "Control centre", href: "/admin", icon: LayoutDashboard },
      { label: "Applications", href: "/admin#applications", icon: ClipboardCheck, badge: "18" },
      { label: "Chapters", href: "/admin#chapters", icon: Building2 },
      { label: "Payments", href: "/admin#payments", icon: CreditCard },
      { label: "Content", href: "/admin#content", icon: Newspaper },
      { label: "Governance", href: "/admin#governance", icon: Landmark },
      { label: "Security", href: "/admin#security", icon: Lock },
      { label: "Settings", href: "/admin#settings", icon: Settings },
    ],
  },
};

type DashboardShellProps = {
  role: DashboardRole;
  children: ReactNode;
};

function BrandMark({ initials, compact = false }: { initials: string; compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-2xl border border-[#70db9d]/45 bg-[linear-gradient(135deg,#005b37,#102119)] font-semibold tracking-[0.08em] text-[#effff3] shadow-[0_0_0_4px_rgba(112,219,157,0.07)] ${compact ? "h-9 w-9 text-[10px]" : "h-11 w-11 text-xs"}`}
    >
      {initials}
    </div>
  );
}

function NavItems({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1.5" role="list">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isCurrent = index === 0;

        return (
          <li key={item.label}>
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[#70db9d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b100d] ${
                isCurrent
                  ? "bg-[#008751] text-white shadow-[0_10px_24px_rgba(0,135,81,0.22)]"
                  : "text-[#b8c5b9] hover:bg-white/[0.055] hover:text-white"
              }`}
              href={item.href}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={isCurrent ? 2.5 : 2} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-[#e9c349]/15 px-2 py-0.5 text-xs font-bold tabular-nums text-[#f5cf4c]">
                  {item.badge}
                </span>
              ) : null}
              {!isCurrent ? <ChevronRight aria-hidden="true" className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-70" /> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarContent({ config, onNavigate }: { config: DashboardConfig; onNavigate?: () => void }) {
  const helpId = onNavigate ? "dashboard-mobile-demo-action-help" : "dashboard-demo-action-help";

  return (
    <>
      <div className="mb-8 flex items-center gap-3 px-1">
        <BrandMark initials={config.initials} />
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold tracking-[-0.025em] text-[#76e9a6]">{config.name}</p>
          <p className="mt-0.5 truncate text-xs font-semibold uppercase tracking-[0.08em] text-[#e9c349]">{config.eyebrow}</p>
        </div>
      </div>

      <nav aria-label={`${config.name} navigation`} className="flex-1">
        <NavItems items={config.navItems} onNavigate={onNavigate} />
      </nav>

      <div className="mt-8 border-t border-white/[0.09] pt-5">
        <button
          aria-describedby={helpId}
          className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-[#70db9d]/20 bg-[#008751]/80 px-4 py-2.5 text-sm font-bold text-white opacity-70"
          disabled
          type="button"
        >
          {config.name === "SESC Admin" ? <FileDown aria-hidden="true" className="h-[18px] w-[18px]" /> : <Sparkles aria-hidden="true" className="h-[18px] w-[18px]" />}
          <span>{config.actionLabel}</span>
        </button>
        <p className="mt-2 px-1 text-xs leading-5 text-[#839287]" id={helpId}>
          {config.actionHint}
        </p>
      </div>
    </>
  );
}

export function DashboardShell({ role, children }: DashboardShellProps) {
  const config = dashboardConfigs[role];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const restoreMobileMenuFocus = useRef(false);

  const closeMobileMenu = useCallback(() => {
    restoreMobileMenuFocus.current = true;
    setMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
      }

      if (event.key === "Tab" && mobileDialogRef.current) {
        const focusable = Array.from(
          mobileDialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        const first = focusable[0];
        const last = focusable.at(-1);

        if (!first || !last) {
          return;
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen && restoreMobileMenuFocus.current) {
      mobileMenuButtonRef.current?.focus({ preventScroll: true });
      restoreMobileMenuFocus.current = false;
    }
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-svh bg-[#0b100d] text-[#eff4ef] selection:bg-[#70db9d] selection:text-[#062815]">
      <a
        className="sr-only left-4 top-4 z-[70] rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#073d2b] outline-none focus:not-sr-only focus:fixed focus:ring-2 focus:ring-[#70db9d]"
        href="#dashboard-content"
      >
        Skip to dashboard content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.25rem] flex-col border-r border-white/[0.08] bg-[#0d120f] p-5 shadow-[16px_0_50px_rgba(0,0,0,0.12)] lg:flex">
        <SidebarContent config={config} />
      </aside>

      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0b100d]/90 px-4 backdrop-blur-xl lg:ml-[17.25rem] lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-controls="dashboard-mobile-navigation"
            aria-expanded={mobileMenuOpen}
            aria-label="Open dashboard navigation"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/[0.12] text-[#e8f0e8] outline-none transition hover:border-[#70db9d]/55 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#70db9d] lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            ref={mobileMenuButtonRef}
            type="button"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-[#70db9d] sm:block">SESC digital headquarters</p>
            <p className="truncate text-sm font-semibold text-[#dfe9e0]">{config.context}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-[#e9c349]/25 bg-[#e9c349]/10 px-3 py-1.5 text-xs font-bold text-[#f5cf4c] md:flex">
            <Crown aria-hidden="true" className="h-3.5 w-3.5" />
            Development preview
          </span>
          <button
            aria-label="Search is unavailable in this demo"
            className="grid h-10 w-10 cursor-not-allowed place-items-center rounded-xl text-[#91a095] opacity-55"
            disabled
            type="button"
          >
            <Search aria-hidden="true" className="h-[19px] w-[19px]" />
          </button>
          <button
            aria-label="Notifications are unavailable in this demo"
            className="grid h-10 w-10 cursor-not-allowed place-items-center rounded-xl text-[#91a095] opacity-55"
            disabled
            type="button"
          >
            <Bell aria-hidden="true" className="h-[19px] w-[19px]" />
          </button>
          <button
            aria-label="Help is unavailable in this demo"
            className="hidden h-10 w-10 cursor-not-allowed place-items-center rounded-xl text-[#91a095] opacity-55 sm:grid"
            disabled
            type="button"
          >
            <CircleHelp aria-hidden="true" className="h-[19px] w-[19px]" />
          </button>
          <BrandMark compact initials={config.initials} />
        </div>
      </header>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close dashboard navigation"
            className="absolute inset-0 cursor-default bg-black/65 backdrop-blur-[2px]"
            onClick={closeMobileMenu}
            type="button"
          />
          <aside
            aria-label={`${config.name} navigation`}
            aria-modal="true"
            className="relative flex h-full w-[min(21.5rem,calc(100%-2.5rem))] flex-col overflow-y-auto border-r border-white/[0.1] bg-[#0d120f] p-5 shadow-2xl"
            id="dashboard-mobile-navigation"
            ref={mobileDialogRef}
            role="dialog"
          >
            <div className="mb-5 flex justify-end">
              <button
                aria-label="Close dashboard navigation"
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.12] text-[#e7efe8] outline-none transition hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#70db9d]"
                onClick={closeMobileMenu}
                ref={closeButtonRef}
                type="button"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent config={config} onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="relative lg:ml-[17.25rem]" id="dashboard-content" tabIndex={-1}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_at_75%_-20%,rgba(0,135,81,0.20),transparent_58%)]" />
        <div className="relative mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10 xl:px-10">{children}</div>
      </div>
      <footer
        aria-label="Platform technology credit"
        className="dashboard-partner-credit lg:ml-[17.25rem]"
        data-testid="portal-technology-credit"
      >
        <p>
          Digital platform designed and developed in partnership with{" "}
          <TopsborgWebsiteLink showIcon>TOPSBORG Technologies Limited</TopsborgWebsiteLink>.
        </p>
      </footer>
    </div>
  );
}

export function DashboardEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.15em] text-[#70db9d]">
      <LineChart aria-hidden="true" className="h-4 w-4" />
      {children}
    </p>
  );
}

export function DashboardPanel({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return <section className={`rounded-2xl border border-[#314337]/80 bg-[#111813]/90 shadow-[0_14px_34px_rgba(0,0,0,0.12)] ${className}`} id={id}>{children}</section>;
}
