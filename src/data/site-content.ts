import type { Metadata } from "next";

/**
 * Public-site content is deliberately held in one typed module until the CMS
 * is connected. Records marked as demonstration content must be replaced with
 * approved editorial copy before public launch.
 */

export type ContentTone = "confirmed" | "development";

export interface ContentNotice {
  readonly label: string;
  readonly copy: string;
  readonly tone: ContentTone;
}

export interface ContentFact {
  readonly label: string;
  readonly value: string;
}

export interface PageContent {
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly body: readonly string[];
  readonly notice?: ContentNotice;
}

export interface DirectoryEntry extends PageContent {
  readonly slug: string;
  readonly facts?: readonly ContentFact[];
  readonly badge?: string;
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export interface LegalDocument extends PageContent {
  readonly slug: string;
}

export interface SearchEntry {
  readonly type: "Page" | "Leadership" | "Chapter" | "Match" | "News" | "Event" | "Gallery" | "Partner" | "FAQ";
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly keywords: readonly string[];
}

export const editableNotice: ContentNotice = {
  label: "Editable demonstration content",
  copy:
    "This page uses safe development copy and placeholder records. Confirm official names, dates, contact information, legal text and media before publication.",
  tone: "development",
};

export const confirmedEventNotice: ContentNotice = {
  label: "Event details remain editable",
  copy:
    "The date and venue below were supplied for initial platform content. Programme, guest, sponsor and RSVP details must be confirmed by authorised club editors before publication.",
  tone: "confirmed",
};

export const aboutPage: PageContent = {
  eyebrow: "About SESC",
  title: "A united voice behind the Eagles.",
  summary:
    "The Super Eagles Supporters Club of Nigeria is building a welcoming digital home for supporters, chapters and the wider football community.",
  body: [
    "This public story page is structured for an approved club history, mission, vision and governance narrative. Official historical milestones and institutional records have not yet been supplied for publication.",
    "The platform is designed to make the club easier to discover, join and support while giving authorised editors a clear place to maintain accurate public information.",
  ],
  notice: editableNotice,
};

export const clubValues = [
  {
    title: "Community",
    summary: "A place for supporters to organise, celebrate and participate together.",
  },
  {
    title: "Respect",
    summary: "A public standard for inclusive, responsible supporter culture.",
  },
  {
    title: "Service",
    summary: "A framework for chapter activity, volunteering and club contribution.",
  },
  {
    title: "Pride",
    summary: "A digital stage for Nigerian football passion and shared identity.",
  },
] as const;

export const leadershipPage: PageContent = {
  eyebrow: "Leadership",
  title: "Leadership with clarity and care.",
  summary:
    "Explore the public leadership structure. Individual names and biographies are published only after the club confirms them.",
  body: [
    "The directory below is an editable framework for approved leadership bodies and office profiles. It avoids inventing personal information while making the public structure easy to understand.",
  ],
  notice: editableNotice,
};

export const chaptersPage: PageContent = {
  eyebrow: "Chapters",
  title: "Supporter energy, connected across borders.",
  summary:
    "A growing directory for verified state and international supporter chapters.",
  body: [
    "Only officially confirmed chapters should appear in the live directory. The entries below are clearly marked development templates until the club approves public records.",
  ],
  notice: editableNotice,
};

export const matchCentrePage: PageContent = {
  eyebrow: "Match Centre",
  title: "Follow the Eagles with trusted matchday information.",
  summary:
    "Fixtures, matchday guidance and supporter updates will be published here after official confirmation.",
  body: [
    "The Match Centre is designed to distinguish verified club updates from unconfirmed information. Current records are editable demonstrations, not live fixture announcements.",
  ],
  notice: editableNotice,
};

export const newsPage: PageContent = {
  eyebrow: "News & Media",
  title: "The latest from the supporters' community.",
  summary:
    "Read approved club announcements, chapter stories and public updates in one editorial home.",
  body: [
    "The articles below are safe demonstration records that show the editorial format. They are not reports of real activity, appointments or club decisions.",
  ],
  notice: editableNotice,
};

export const eventsPage: PageContent = {
  eyebrow: "Events",
  title: "Moments that bring the community together.",
  summary:
    "Discover authorised club, chapter and ceremonial event information as it is published.",
  body: [
    "Event records are editable by authorised editors. Details that affect attendance, travel, payment or access will only be shown once they have been officially confirmed.",
  ],
  notice: editableNotice,
};

export const galleryPage: PageContent = {
  eyebrow: "Gallery",
  title: "The colour, pride and shared moments of SESC.",
  summary:
    "A curated home for approved imagery, captions and visual stories from the supporters' community.",
  body: [
    "These album structures are ready for properly cleared, accessible media. No placeholder photography is presented as a real club moment.",
  ],
  notice: editableNotice,
};

export const partnersPage: PageContent = {
  eyebrow: "Partners",
  title: "Partnerships with purpose.",
  summary:
    "Meet approved partners supporting the club's community, digital platform and long-term ambitions.",
  body: [
    "Partner records are only published after the relationship, approved description, logo rights and public links have been confirmed. The directory includes safe editable templates for future records.",
  ],
  notice: editableNotice,
};

export const faqPage: PageContent = {
  eyebrow: "Frequently asked questions",
  title: "Clear answers, in one place.",
  summary:
    "Find guidance on public platform features, chapters, matches, partnerships and legal information.",
  body: [
    "Answers describe the intended platform experience and do not substitute for an official policy, fixture announcement or public contact channel.",
  ],
  notice: editableNotice,
};

export const searchPage: PageContent = {
  eyebrow: "Search",
  title: "Find your way around SESC.",
  summary:
    "Search public club content, including leadership, chapters, matches, news, events, galleries and partners.",
  body: [],
};

export const legalIndexPage: PageContent = {
  eyebrow: "Legal & accessibility",
  title: "Policies awaiting final approval.",
  summary:
    "The platform has dedicated locations for official legal and accessibility information once it is supplied by authorised representatives.",
  body: [
    "The documents listed below are transparent placeholders. They should be replaced with approved, current content before the public service is launched.",
  ],
  notice: editableNotice,
};

export const leadershipProfiles: readonly DirectoryEntry[] = [
  {
    slug: "national-president",
    eyebrow: "Leadership profile",
    title: "Office of the National President",
    summary:
      "Editable leadership profile. The approved office-holder biography and portrait will appear here after confirmation.",
    body: [
      "This page intentionally does not identify an office-holder until the club provides an approved public biography, portrait and term information.",
      "It is ready for an editor to add the office remit, leadership priorities and verified public contact route without exposing private information.",
    ],
    facts: [
      { label: "Office-holder", value: "Awaiting official confirmation" },
      { label: "Term information", value: "Awaiting official confirmation" },
      { label: "Public biography", value: "Awaiting approved copy" },
    ],
    badge: "Editable profile",
    notice: editableNotice,
  },
  {
    slug: "national-executive-council",
    eyebrow: "Leadership body",
    title: "National Executive Council",
    summary:
      "Editable council overview for confirmed national roles, responsibilities and approved public profiles.",
    body: [
      "The National Executive Council directory will be published once office assignments and public biographies have been verified by the club.",
      "The final page can introduce each approved office and link to individual leadership profiles while preserving personal privacy.",
    ],
    facts: [
      { label: "Council roster", value: "Awaiting official confirmation" },
      { label: "Responsibilities", value: "Editable by authorised editors" },
      { label: "Public profiles", value: "Available after approval" },
    ],
    badge: "Council",
    notice: editableNotice,
  },
  {
    slug: "board-of-trustees",
    eyebrow: "Leadership body",
    title: "Board of Trustees",
    summary:
      "Editable board overview for verified trustee profiles, governance context and approved public information.",
    body: [
      "No trustee identities, biographies or appointment information are asserted on this development page.",
      "Once approved, the page can provide a concise public description of the board and link to each permitted profile.",
    ],
    facts: [
      { label: "Trustee roster", value: "Awaiting official confirmation" },
      { label: "Governance information", value: "Awaiting approved copy" },
      { label: "Profile visibility", value: "Editor controlled" },
    ],
    badge: "Board",
    notice: editableNotice,
  },
  {
    slug: "elders-council",
    eyebrow: "Leadership body",
    title: "Elders Council",
    summary:
      "Editable overview for any approved advisory structure and its public-facing contribution to the club.",
    body: [
      "This section is reserved for an official description of the Elders Council, if and when the club elects to publish one.",
      "Names, remit and historical information remain intentionally absent until authorised source material is provided.",
    ],
    facts: [
      { label: "Council information", value: "Awaiting official confirmation" },
      { label: "Public directory", value: "Not yet published" },
    ],
    badge: "Advisory",
    notice: editableNotice,
  },
];

export const chapters: readonly DirectoryEntry[] = [
  {
    slug: "state-chapter-demo",
    eyebrow: "State chapter",
    title: "State chapter profile — demonstration",
    summary:
      "A safe template for an authorised state chapter directory entry, leadership summary and local activity calendar.",
    body: [
      "This is not an assertion that a chapter exists in a particular location. It demonstrates the content structure that will be used after chapter status, officers and public contact routes are confirmed.",
      "Approved records can include a concise chapter story, event links and membership guidance without publishing private member data.",
    ],
    facts: [
      { label: "Location", value: "Awaiting official confirmation" },
      { label: "Chapter status", value: "Development record" },
      { label: "Public contact", value: "Awaiting authorised publication" },
    ],
    badge: "State directory",
    notice: editableNotice,
  },
  {
    slug: "international-chapter-demo",
    eyebrow: "International chapter",
    title: "International chapter profile — demonstration",
    summary:
      "A safe template for international chapter information, approved public contacts and local supporter activity.",
    body: [
      "International locations and officer details will only appear after they have been supplied and approved by the club.",
      "The final profile can connect supporters to verified membership and event information while keeping sensitive chapter administration private.",
    ],
    facts: [
      { label: "Country or region", value: "Awaiting official confirmation" },
      { label: "Chapter status", value: "Development record" },
      { label: "Public contact", value: "Awaiting authorised publication" },
    ],
    badge: "Global directory",
    notice: editableNotice,
  },
];

export const matches: readonly DirectoryEntry[] = [
  {
    slug: "next-super-eagles-fixture",
    eyebrow: "Match centre",
    title: "Next Super Eagles fixture",
    summary:
      "Opponent, competition, kick-off time, venue and broadcast information are awaiting official confirmation.",
    body: [
      "The Match Centre is ready to publish verified fixtures, matchday information and supporter guidance as it is approved by authorised editors.",
      "No fixture date, opponent, score, venue or broadcast service is claimed on this development record.",
    ],
    facts: [
      { label: "Opponent", value: "To be confirmed" },
      { label: "Kick-off", value: "To be confirmed" },
      { label: "Venue", value: "To be confirmed" },
      { label: "Competition", value: "To be confirmed" },
    ],
    badge: "Fixture pending",
    notice: editableNotice,
  },
  {
    slug: "matchday-supporter-guide-demo",
    eyebrow: "Supporter guide",
    title: "Matchday supporter guide — demonstration",
    summary:
      "A future home for official meeting points, travel advice, safety guidance and on-the-day updates.",
    body: [
      "This content template is intentionally free of unsupported travel, ticketing or venue details.",
      "When an official matchday plan is supplied, editors can publish concise, accessible updates in this format.",
    ],
    facts: [
      { label: "Match reference", value: "Awaiting official confirmation" },
      { label: "Supporter arrangements", value: "Not yet published" },
    ],
    badge: "Guide template",
    notice: editableNotice,
  },
];

export const newsArticles: readonly DirectoryEntry[] = [
  {
    slug: "editorial-club-update-demo",
    eyebrow: "Club update",
    title: "Editorial demonstration: club update",
    summary:
      "A reusable article layout for approved club announcements, reports and community updates.",
    body: [
      "This is sample editorial structure, not a report of a real club activity or decision.",
      "Author, publish date, source links and media should be added only when they have been reviewed and approved for public release.",
    ],
    facts: [
      { label: "Publication status", value: "Demonstration content" },
      { label: "Author", value: "Awaiting editorial assignment" },
      { label: "Publish date", value: "Awaiting approval" },
    ],
    badge: "Editorial demo",
    notice: editableNotice,
  },
  {
    slug: "chapter-community-story-demo",
    eyebrow: "Community",
    title: "Editorial demonstration: chapter community story",
    summary:
      "A safe format for approved stories that celebrate supporter activity without exposing personal information.",
    body: [
      "No chapter event, participant, place or outcome is claimed in this sample article.",
      "The CMS can add source credit, accessibility text and approved photography when editorial material is available.",
    ],
    facts: [
      { label: "Publication status", value: "Demonstration content" },
      { label: "Source material", value: "Awaiting editorial approval" },
    ],
    badge: "Editorial demo",
    notice: editableNotice,
  },
];

export const events: readonly DirectoryEntry[] = [
  {
    slug: "awards-gala-night-2026",
    eyebrow: "Featured event",
    title: "SESC Awards & Gala Night 2026",
    summary:
      "Friday, 30th October 2026 at Four Points by Sheraton Lagos, Victoria Island, Lagos State, Nigeria.",
    body: [
      "This initial event listing uses the date and venue supplied for the platform brief. It is designed to be edited as event plans develop.",
      "Programme, guests, award categories, RSVP arrangements, sponsors and downloadable materials will appear only after they have been officially approved for public release.",
    ],
    facts: [
      { label: "Date", value: "Friday, 30th October 2026" },
      {
        label: "Venue",
        value: "Four Points by Sheraton Lagos, Victoria Island, Lagos State, Nigeria",
      },
      { label: "Programme", value: "Awaiting official confirmation" },
      { label: "RSVP", value: "Awaiting authorised publication" },
    ],
    badge: "Gala 2026",
    notice: confirmedEventNotice,
  },
  {
    slug: "community-event-demo",
    eyebrow: "Community event",
    title: "Community event — demonstration",
    summary:
      "A reusable event page for an approved supporter gathering, chapter programme or club initiative.",
    body: [
      "This sample does not assert a real event, date, venue, organiser or attendance requirement.",
      "Once approved, the final record can include accessible registration guidance and clear public event updates.",
    ],
    facts: [
      { label: "Date", value: "To be confirmed" },
      { label: "Venue", value: "To be confirmed" },
      { label: "Registration", value: "Not yet available" },
    ],
    badge: "Event template",
    notice: editableNotice,
  },
];

export const galleryAlbums: readonly DirectoryEntry[] = [
  {
    slug: "club-moments-demo",
    eyebrow: "Gallery album",
    title: "Club moments — demonstration album",
    summary:
      "A future curated collection for approved supporter, chapter and club photography.",
    body: [
      "No photos are embedded in this development album because approved image rights, alt text and source information have not yet been supplied.",
      "The final album will pair optimised media with meaningful captions and photographer or source credit where required.",
    ],
    facts: [
      { label: "Media status", value: "Awaiting approved assets" },
      { label: "Image credits", value: "Awaiting source information" },
      { label: "Accessibility text", value: "Required before publication" },
    ],
    badge: "Album template",
    notice: editableNotice,
  },
  {
    slug: "gala-archive-demo",
    eyebrow: "Gallery album",
    title: "Gala archive — demonstration album",
    summary:
      "A structured gallery destination for approved Awards & Gala Night photography and press materials.",
    body: [
      "This album is a presentation template only. It does not imply that event imagery has been captured, cleared or published.",
      "Authorised editors can add captions, date context and approved image assets from the internal content workspace.",
    ],
    facts: [
      { label: "Media status", value: "Awaiting approved assets" },
      { label: "Publication status", value: "Development record" },
    ],
    badge: "Archive template",
    notice: editableNotice,
  },
];

export const partners: readonly DirectoryEntry[] = [
  {
    slug: "topsborg-technologies",
    eyebrow: "Official technology partner",
    title: "TOPSBORG Technologies Limited",
    summary:
      "Technology implementation partner for the SESC web platform under a Goods/Services Sponsorship Agreement.",
    body: [
      "TOPSBORG Technologies Limited designs and develops the SESC digital platform as the official technology implementation partner under the stated Goods/Services Sponsorship Agreement.",
      "The approved partnership positioning covers the platform's responsive public and portal foundation, membership-management enablement, clearer digital communication, administrative efficiency, and secure, scalable long-term digital growth. It does not imply that TOPSBORG owns, operates or controls SESC.",
    ],
    facts: [
      { label: "Partnership title", value: "Official technology implementation partner" },
      { label: "Agreement", value: "Goods/Services Sponsorship Agreement" },
      { label: "Public website", value: "Verified destination shown below" },
      { label: "Logo asset", value: "Awaiting approved upload" },
    ],
    badge: "Technology partner",
    notice: editableNotice,
  },
  {
    slug: "partner-placement-demo",
    eyebrow: "Partnership opportunity",
    title: "Partner placement — demonstration",
    summary:
      "A protected public template for future sponsor, media, travel and institutional partner records.",
    body: [
      "This record represents no real company, endorsement, logo or commercial relationship.",
      "Authorised editors can add only approved partnership descriptions, accessibility labels and verified destination links.",
    ],
    facts: [
      { label: "Partner name", value: "Awaiting approved record" },
      { label: "Category", value: "Awaiting approved record" },
      { label: "Website", value: "Not supplied" },
    ],
    badge: "Directory template",
    notice: editableNotice,
  },
];

export const awardsGalaPage: PageContent = {
  eyebrow: "Awards & Gala Night",
  title: "A ceremonial night for the Eagles' community.",
  summary:
    "SESC Awards & Gala Night is currently planned for Friday, 30th October 2026 at Four Points by Sheraton Lagos, Victoria Island, Lagos State, Nigeria.",
  body: [
    "This premium event section is ready for the approved programme, award categories, public updates, press materials, sponsors and gallery content.",
    "Only the supplied date and venue are shown. Invitation lists, private sponsorship records, guest details and RSVP information are not published here.",
  ],
  notice: confirmedEventNotice,
};

export const pressKitPage: PageContent = {
  eyebrow: "Media & press",
  title: "Press information, ready for approval.",
  summary:
    "A dedicated space for approved club boilerplate, media assets, leadership biographies and event information.",
  body: [
    "No press contacts, downloadable brand assets, statements or media releases have been supplied for publication. This page makes that status clear instead of inventing a contact route or asset library.",
    "Once approved materials are available, authorised editors can publish optimised downloads, credit requirements and current press notices from the content workspace.",
  ],
  notice: editableNotice,
};

export const contactPage: PageContent = {
  eyebrow: "Contact",
  title: "A direct line, when official channels are ready.",
  summary:
    "Official public contact details and enquiry routes are awaiting authorisation from the club.",
  body: [
    "No telephone number, email address, office location or social profile is displayed because none has been approved for this platform.",
    "When verified channels are supplied, this page can provide an accessible contact form, response expectations and the correct routing for membership, media and partnership enquiries.",
  ],
  notice: editableNotice,
};

export const maintenancePage: PageContent = {
  eyebrow: "Maintenance mode",
  title: "The digital clubhouse is being prepared.",
  summary:
    "This is the platform's planned-maintenance presentation. It does not assert a current incident or restoration time.",
  body: [
    "Use this route only while authorised maintenance is active. Editors should replace the message with approved status information when one is available.",
  ],
  notice: editableNotice,
};

export const faqs: readonly FaqEntry[] = [
  {
    question: "How do I start a membership application?",
    answer:
      "Use the membership journey when it is open. The application process will explain the information and verification steps required before submission.",
  },
  {
    question: "Where can I find my chapter?",
    answer:
      "The chapter directory will show only confirmed public records. Current demonstration entries are clearly marked until the club approves official chapter information.",
  },
  {
    question: "When is the next match?",
    answer:
      "The Match Centre will publish fixture information only after it has been confirmed by authorised editors. Do not rely on unverified social posts for travel or ticketing plans.",
  },
  {
    question: "How can an organisation explore a partnership?",
    answer:
      "The partnership directory explains the platform structure. A verified sponsorship contact route will be published once it is supplied and approved by the club.",
  },
  {
    question: "Where are the club's legal policies?",
    answer:
      "The legal section is ready for the club's approved policies. The current pages are transparent placeholders and should not be treated as final legal terms.",
  },
];

export const legalDocuments: readonly LegalDocument[] = [
  {
    slug: "privacy-policy",
    eyebrow: "Legal",
    title: "Privacy Policy",
    summary:
      "Approved privacy terms have not yet been supplied for publication. This is an editable demonstration page, not a final policy.",
    body: [
      "Before launch, the club must provide an approved privacy policy covering the platform's actual data practices, lawful bases, retention, rights, contact route and any third-party services in use.",
      "Until then, users should not treat this placeholder as legal advice, a contractual statement or a description of live processing.",
    ],
    notice: editableNotice,
  },
  {
    slug: "terms-and-conditions",
    eyebrow: "Legal",
    title: "Terms and Conditions",
    summary:
      "Approved platform terms have not yet been supplied for publication. This is an editable demonstration page, not a final agreement.",
    body: [
      "Authorised legal and club representatives must supply the final terms, including membership, community, event and platform provisions that apply to the released service.",
      "This development content intentionally avoids inventing obligations, rights, fees, governing law or enforcement processes.",
    ],
    notice: editableNotice,
  },
  {
    slug: "cookie-policy",
    eyebrow: "Legal",
    title: "Cookie Policy",
    summary:
      "Approved cookie information has not yet been supplied for publication. This is an editable demonstration page, not a final policy.",
    body: [
      "The final policy should reflect the cookies and similar technologies actually used after the platform's analytics, authentication and consent configuration are approved.",
      "No tracking practice is claimed on this placeholder page.",
    ],
    notice: editableNotice,
  },
  {
    slug: "accessibility-statement",
    eyebrow: "Legal",
    title: "Accessibility Statement",
    summary:
      "An approved accessibility statement will be published here. This development page describes the intended structure, not a certification claim.",
    body: [
      "The released statement should document the platform's current accessibility approach, known limitations, review date and a verified feedback route.",
      "The platform is being built with semantic structure, keyboard support and responsive content patterns, but no compliance certification is claimed by this placeholder.",
    ],
    notice: editableNotice,
  },
];

export function findBySlug<T extends { readonly slug: string }>(
  entries: readonly T[],
  slug: string,
): T | undefined {
  return entries.find((entry) => entry.slug === slug);
}

export function getLegalDocument(slug: string): LegalDocument {
  const legalDocument = findBySlug(legalDocuments, slug);

  if (!legalDocument) {
    throw new Error(`Missing legal document content for: ${slug}`);
  }

  return legalDocument;
}

export function createPageMetadata(title: string, description: string): Metadata {
  const fullTitle = `${title} | SESC`;

  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  };
}

export const publicSearchEntries: readonly SearchEntry[] = [
  {
    type: "Page",
    title: aboutPage.title,
    description: aboutPage.summary,
    href: "/about",
    keywords: ["about", "club", "history", "mission", "vision", "values"],
  },
  {
    type: "Page",
    title: awardsGalaPage.title,
    description: awardsGalaPage.summary,
    href: "/awards-gala",
    keywords: ["awards", "gala", "event", "2026"],
  },
  {
    type: "Page",
    title: pressKitPage.title,
    description: pressKitPage.summary,
    href: "/media/press-kit",
    keywords: ["media", "press", "kit", "assets"],
  },
  {
    type: "Page",
    title: contactPage.title,
    description: contactPage.summary,
    href: "/contact",
    keywords: ["contact", "enquiry", "help"],
  },
  ...leadershipProfiles.map((entry) => ({
    type: "Leadership" as const,
    title: entry.title,
    description: entry.summary,
    href: `/leadership/${entry.slug}`,
    keywords: ["leadership", "council", "board", "office"],
  })),
  ...chapters.map((entry) => ({
    type: "Chapter" as const,
    title: entry.title,
    description: entry.summary,
    href: `/chapters/${entry.slug}`,
    keywords: ["chapter", "state", "international", "supporters"],
  })),
  ...matches.map((entry) => ({
    type: "Match" as const,
    title: entry.title,
    description: entry.summary,
    href: `/match-centre/${entry.slug}`,
    keywords: ["match", "fixture", "super eagles", "supporter guide"],
  })),
  ...newsArticles.map((entry) => ({
    type: "News" as const,
    title: entry.title,
    description: entry.summary,
    href: `/news/${entry.slug}`,
    keywords: ["news", "editorial", "community", "update"],
  })),
  ...events.map((entry) => ({
    type: "Event" as const,
    title: entry.title,
    description: entry.summary,
    href: `/events/${entry.slug}`,
    keywords: ["event", "gala", "awards", "community"],
  })),
  ...galleryAlbums.map((entry) => ({
    type: "Gallery" as const,
    title: entry.title,
    description: entry.summary,
    href: `/gallery/${entry.slug}`,
    keywords: ["gallery", "album", "photos", "media"],
  })),
  ...partners.map((entry) => ({
    type: "Partner" as const,
    title: entry.title,
    description: entry.summary,
    href: entry.slug === "topsborg-technologies" ? "/partners/topsborg-technologies" : "/partners",
    keywords: ["partner", "sponsor", "topsborg", "technology"],
  })),
  ...faqs.map((entry, index) => ({
    type: "FAQ" as const,
    title: entry.question,
    description: entry.answer,
    href: `/faq#question-${index + 1}`,
    keywords: ["faq", "help", "questions"],
  })),
];

export function searchPublicContent(rawQuery: string): SearchEntry[] {
  const query = rawQuery.trim().toLocaleLowerCase();

  if (!query) {
    return [];
  }

  const queryTerms = query.split(/\s+/).filter(Boolean);

  return publicSearchEntries.filter((entry) => {
    const haystack = [entry.title, entry.description, entry.type, ...entry.keywords]
      .join(" ")
      .toLocaleLowerCase();

    return queryTerms.every((term) => haystack.includes(term));
  });
}
