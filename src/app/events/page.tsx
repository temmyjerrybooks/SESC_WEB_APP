import { DirectoryPage } from "@/components/public-content";
import { createPageMetadata, events, eventsPage } from "@/data/site-content";

export const metadata = createPageMetadata(eventsPage.title, eventsPage.summary);

export default function EventsPage() {
  return (
    <DirectoryPage
      content={eventsPage}
      entries={events}
      hrefFor={(entry) => `/events/${entry.slug}`}
      linkLabel="View event details"
      sectionCopy="Attendance, RSVP and practical arrangements are published only after authorised confirmation."
      sectionTitle="What is ahead"
      visualLabel="EVENT"
    />
  );
}
