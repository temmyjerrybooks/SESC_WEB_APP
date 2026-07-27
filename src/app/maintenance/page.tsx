import { StandardPage } from "@/components/public-content";
import { createPageMetadata, maintenancePage } from "@/data/site-content";

export const metadata = createPageMetadata(maintenancePage.title, maintenancePage.summary);

export default function MaintenancePage() {
  return (
    <StandardPage
      actions={[{ href: "/", label: "Return to the home page", variant: "secondary" }]}
      content={maintenancePage}
    />
  );
}
