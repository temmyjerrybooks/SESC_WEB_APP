"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

const primaryLinks = [
  { href: "/about", label: "The Club" },
  { href: "/leadership", label: "Leadership" },
  { href: "/membership", label: "Membership" },
  { href: "/chapters", label: "Chapters" },
  { href: "/match-centre", label: "Match Centre" },
  { href: "/news", label: "News" },
  { href: "/events", label: "Events" },
];

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const drawerPanelRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const restoreMenuFocus = useRef(false);

  const closeDrawer = useCallback(() => {
    restoreMenuFocus.current = true;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFirstControl = window.requestAnimationFrame(() => {
      drawerPanelRef.current?.querySelector<HTMLElement>("button, a[href]")?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawerPanelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirstControl);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeDrawer, isOpen]);

  useEffect(() => {
    if (!isOpen && restoreMenuFocus.current) {
      menuButtonRef.current?.focus({ preventScroll: true });
      restoreMenuFocus.current = false;
    }
  }, [isOpen]);

  return (
    <>
      <div className="announcement-bar">
        <span className="announcement-bar__dot" aria-hidden="true" />
        Membership application availability will be announced through verified club channels.
        <Link href="/membership">Explore membership</Link>
      </div>
      <header className={`site-header ${isScrolled ? "site-header--solid" : ""}`}>
        <div className="site-header__inner">
          <BrandMark />
          <nav aria-label="Primary navigation" className="site-nav">
            {primaryLinks.map((link) => (
              <Link
                aria-current={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "page" : undefined}
                className={pathname === link.href || pathname.startsWith(`${link.href}/`) ? "is-active" : undefined}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="site-header__actions">
            <Link aria-label="Search the SESC site" className="icon-button" href="/search">
              <Search size={19} strokeWidth={2.2} />
            </Link>
            <Link className="text-link site-header__login" href="/login">
              Member login
            </Link>
            <Link className="button button--primary site-header__join" href="/membership">
              Membership details
            </Link>
            <button
              aria-controls="mobile-navigation"
              aria-expanded={isOpen}
              aria-label={isOpen ? "Close navigation" : "Open navigation"}
              className="icon-button site-header__menu"
              onClick={() => {
                if (isOpen) {
                  closeDrawer();
                  return;
                }
                setIsOpen(true);
              }}
              ref={menuButtonRef}
              type="button"
            >
              {isOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
      </header>
      <div className={`mobile-drawer ${isOpen ? "mobile-drawer--open" : ""}`} id="mobile-navigation">
        <div aria-hidden="true" className="mobile-drawer__backdrop" onClick={closeDrawer} />
        <nav aria-label="Mobile navigation" aria-modal="true" className="mobile-drawer__panel" ref={drawerPanelRef} role="dialog">
          <div className="mobile-drawer__top">
            <BrandMark />
            <button aria-label="Close navigation" className="icon-button" onClick={closeDrawer} type="button">
              <X size={22} />
            </button>
          </div>
          <div className="mobile-drawer__links">
            {primaryLinks.map((link, index) => (
              <Link href={link.href} key={link.href} onClick={() => setIsOpen(false)}>
                <span>0{index + 1}</span>
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mobile-drawer__bottom">
            <Link className="button button--primary" href="/membership">
              Membership details
            </Link>
            <Link className="button button--secondary" href="/login">
              Member login
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
