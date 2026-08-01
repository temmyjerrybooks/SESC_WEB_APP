import { ArrowUpRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { siteConfig } from "@/config/site";

type TopsborgWebsiteLinkProps = Omit<
  ComponentPropsWithoutRef<"a">,
  "aria-label" | "href" | "rel" | "target"
> & {
  readonly children?: ReactNode;
  readonly showIcon?: boolean;
  readonly "aria-label"?: string;
};

/**
 * The sole application component for public TOPSBORG website links. Keeping
 * the URL and tab-security attributes here prevents public placements from
 * drifting apart as the partnership content evolves.
 */
export function TopsborgWebsiteLink({
  children = siteConfig.partners.topsborg.name,
  showIcon = false,
  "aria-label": ariaLabel,
  ...anchorProps
}: TopsborgWebsiteLinkProps) {
  return (
    <a
      {...anchorProps}
      aria-label={
        ariaLabel ??
        ("Visit " +
          siteConfig.partners.topsborg.name +
          " website (opens in a new tab)")
      }
      href={siteConfig.partners.topsborg.url}
      rel="sponsored noopener noreferrer"
      target="_blank"
    >
      {children}
      {showIcon ? <ArrowUpRight aria-hidden="true" size={15} /> : null}
    </a>
  );
}
