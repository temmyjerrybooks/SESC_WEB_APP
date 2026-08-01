import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { TopsborgWebsiteLink } from "@/components/topsborg-website-link";

const linkGroups = [
  {
    title: "Discover",
    links: [
      ["The Club", "/about"],
      ["Leadership", "/leadership"],
      ["State & global chapters", "/chapters"],
      ["Awards & Gala Night", "/awards-gala"],
    ],
  },
  {
    title: "Membership",
    links: [
      ["Membership benefits", "/membership"],
      ["Application availability", "/membership/apply"],
      ["Verify a membership", "/membership/verify"],
      ["Member login", "/login"],
    ],
  },
  {
    title: "Connect",
    links: [
      ["News & media", "/news"],
      ["Events", "/events"],
      ["Partner with us", "/partners"],
      ["Contact", "/contact"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div aria-hidden="true" className="site-footer__glow" />
      <div className="site-footer__inner">
        <div className="site-footer__lead">
          <BrandMark />
          <p>
            The official supporters&apos; platform celebrating Nigerian football, community, and the enduring spirit of
            the Super Eagles.
          </p>
          <div className="site-footer__contact">
            <span>
              <MapPin size={16} /> Nigeria and global chapters
            </span>
            <Link href="/contact">
              <Mail size={16} /> Contact the club
            </Link>
          </div>
        </div>
        {linkGroups.map((group) => (
          <div className="site-footer__group" key={group.title}>
            <h2>{group.title}</h2>
            <ul>
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="site-footer__base">
        <p>(c) {new Date().getFullYear()} Super Eagles Supporters Club of Nigeria.</p>
        <p className="site-footer__partner">
          Digital Platform designed and developed in partnership with{" "}
          <TopsborgWebsiteLink showIcon>
            TOPSBORG Technologies Limited
          </TopsborgWebsiteLink>
          .
        </p>
        <div className="site-footer__legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/accessibility">Accessibility</Link>
        </div>
        <p className="site-footer__pending">Official social profiles will be listed after confirmation.</p>
      </div>
    </footer>
  );
}
