import { EmptyState, StandardPage } from "@/components/public-content";
import { createPageMetadata, pressKitPage } from "@/data/site-content";

export const metadata = createPageMetadata(pressKitPage.title, pressKitPage.summary);

export default function PressKitPage() {
  return (
    <StandardPage content={pressKitPage}>
      <EmptyState
        action={{ href: "/contact", label: "View contact status", variant: "secondary" }}
        copy="Approved press releases, brand assets and media contacts have not been supplied for this public release."
        title="Press materials are awaiting approval."
      />
    </StandardPage>
  );
}
