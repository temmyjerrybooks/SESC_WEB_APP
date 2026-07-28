import type { MetadataRoute } from "next";
import {
  chapters,
  events,
  galleryAlbums,
  leadershipProfiles,
  legalDocuments,
  matches,
  newsArticles,
  partners,
} from "@/data/site-content";
import { newsCategories } from "@/data/additional-public-content";

type SitemapEntry = {
  pathname: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const corePublicRoutes: SitemapEntry[] = [
  { pathname: "/", changeFrequency: "weekly", priority: 1 },
  { pathname: "/about", changeFrequency: "monthly", priority: 0.9 },
  { pathname: "/about/history", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/about/mission-vision-values", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/leadership", changeFrequency: "monthly", priority: 0.8 },
  { pathname: "/chapters", changeFrequency: "weekly", priority: 0.8 },
  { pathname: "/membership", changeFrequency: "monthly", priority: 0.9 },
  { pathname: "/membership/apply", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/membership/benefits", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/membership/categories", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/membership/verify", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/match-centre", changeFrequency: "daily", priority: 0.8 },
  { pathname: "/match-centre/calendar", changeFrequency: "daily", priority: 0.7 },
  { pathname: "/supporters-travel", changeFrequency: "weekly", priority: 0.6 },
  { pathname: "/news", changeFrequency: "daily", priority: 0.8 },
  { pathname: "/events", changeFrequency: "weekly", priority: 0.8 },
  { pathname: "/gallery", changeFrequency: "weekly", priority: 0.7 },
  { pathname: "/community", changeFrequency: "weekly", priority: 0.7 },
  { pathname: "/awards-gala", changeFrequency: "weekly", priority: 0.8 },
  { pathname: "/partners", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/sponsors", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/partners/sponsorship-opportunities", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/partners/topsborg-technologies", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/media/press-kit", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { pathname: "/contact", changeFrequency: "monthly", priority: 0.7 },
  { pathname: "/legal", changeFrequency: "yearly", priority: 0.4 },
  { pathname: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/cookies", changeFrequency: "yearly", priority: 0.3 },
  { pathname: "/accessibility", changeFrequency: "yearly", priority: 0.3 },
];

const detailPublicRoutes: SitemapEntry[] = [
  ...leadershipProfiles.map(({ slug }) => ({ pathname: `/leadership/${slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ...chapters.map(({ slug }) => ({ pathname: `/chapters/${slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ...matches.map(({ slug }) => ({ pathname: `/match-centre/${slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
  ...newsArticles.map(({ slug }) => ({ pathname: `/news/${slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
  ...newsCategories.map(({ slug }) => ({ pathname: `/news/category/${slug}`, changeFrequency: "daily" as const, priority: 0.5 })),
  ...events.map(({ slug }) => ({ pathname: `/events/${slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ...galleryAlbums.map(({ slug }) => ({ pathname: `/gallery/${slug}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ...partners.map(({ slug }) => ({ pathname: `/partners/${slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ...legalDocuments.map(({ slug }) => ({ pathname: `/legal/${slug}`, changeFrequency: "yearly" as const, priority: 0.2 })),
];

function getSiteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const routes = new Map(
    [...corePublicRoutes, ...detailPublicRoutes].map((route) => [route.pathname, route]),
  );

  return [...routes.values()].map(({ pathname, changeFrequency, priority }) => ({
    url: new URL(pathname, siteUrl).toString(),
    changeFrequency,
    priority,
  }));
}
