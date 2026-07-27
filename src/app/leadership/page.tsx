import { DirectoryPage } from "@/components/public-content";
import { createPageMetadata, leadershipPage, leadershipProfiles } from "@/data/site-content";

export const metadata = createPageMetadata(leadershipPage.title, leadershipPage.summary);

export default function LeadershipPage() {
  return (
    <DirectoryPage
      content={leadershipPage}
      entries={leadershipProfiles}
      hrefFor={(entry) => `/leadership/${entry.slug}`}
      linkLabel="View profile structure"
      sectionCopy="Each route makes its approval status clear until verified public profiles are available."
      sectionTitle="Leadership directory"
      visualLabel="SESC"
    />
  );
}
