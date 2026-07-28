"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const portalRoots = ["/member", "/executive", "/admin"];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPortal = portalRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));

  return (
    <>
      {!isPortal && <SiteHeader />}
      <main id="main-content">{children}</main>
      {!isPortal && <SiteFooter />}
    </>
  );
}
