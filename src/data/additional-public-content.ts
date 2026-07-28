import { editableNotice, type PageContent } from "@/data/site-content";

/**
 * Safe, editor-replaceable copy for public routes that are not yet backed by
 * the content-management workspace. These records deliberately avoid claiming
 * unconfirmed histories, categories, fixtures, commercial packages or travel
 * arrangements.
 */

export interface PublicRouteCard {
  readonly title: string;
  readonly summary: string;
  readonly eyebrow?: string;
  readonly badge?: string;
  readonly href?: string;
  readonly linkLabel?: string;
}

export const clubHistoryPage: PageContent = {
  eyebrow: "About SESC",
  title: "The club story, ready for its verified record.",
  summary:
    "A dedicated home for the Super Eagles Supporters Club of Nigeria's approved history, milestones and legacy.",
  body: [
    "The club's official founding story, leadership eras, landmark supporter moments and institutional milestones have not yet been supplied for public release.",
    "This page is structured so authorised editors can publish a reliable historical record with sources, dates and image rights checked before it becomes public.",
  ],
  notice: editableNotice,
};

export const clubHistoryMilestones: readonly PublicRouteCard[] = [
  {
    eyebrow: "Foundations",
    title: "Official founding record",
    summary:
      "The club's formation date, founding supporters and early purpose will appear here once verified source material is approved.",
    badge: "Awaiting approval",
  },
  {
    eyebrow: "Legacy",
    title: "Supporter milestones",
    summary:
      "Significant chapter, matchday and community milestones can be added with accurate dates, context and approved media.",
    badge: "Editable timeline",
  },
  {
    eyebrow: "Archive",
    title: "Voices from the community",
    summary:
      "Approved memories and historical material can be credited and presented without publishing private supporter information.",
    badge: "Editorial framework",
  },
];

export const missionVisionValuesPage: PageContent = {
  eyebrow: "About SESC",
  title: "Direction with purpose and shared pride.",
  summary:
    "A clear editorial structure for the club's approved mission, vision and values.",
  body: [
    "The final mission and vision statements require approval from the club's authorised leadership. Until then, this page presents a transparent framework rather than claiming official policy.",
    "The values below help illustrate the intended supporter culture: welcoming, responsible, community-minded and proud of Nigerian football.",
  ],
  notice: editableNotice,
};

export const clubDirectionCards: readonly PublicRouteCard[] = [
  {
    eyebrow: "Mission",
    title: "A statement to be approved",
    summary:
      "A concise official mission can explain how SESC serves supporters, strengthens community and represents the Eagles' spirit.",
    badge: "Editable copy",
  },
  {
    eyebrow: "Vision",
    title: "A shared ambition",
    summary:
      "An approved vision can set out the club's long-term contribution to supporter culture in Nigeria and around the world.",
    badge: "Editable copy",
  },
];

export const membershipBenefitsPage: PageContent = {
  eyebrow: "Membership",
  title: "A membership journey built around trust.",
  summary:
    "Understand the supporter experience the platform is designed to make possible after an application is approved.",
  body: [
    "Membership benefits, access rules and availability are set by the club and must be confirmed before public publication. This page uses safe development copy rather than promising unapproved services.",
    "The platform is designed to give approved members a clear account, protected membership status and access to information that has been authorised for their category.",
  ],
  notice: editableNotice,
};

export const membershipBenefitCards: readonly PublicRouteCard[] = [
  {
    eyebrow: "Membership status",
    title: "A verified supporter record",
    summary:
      "Approved members can have a status record that is reviewed by authorised club officers rather than activated automatically.",
    badge: "After approval",
  },
  {
    eyebrow: "Digital experience",
    title: "One protected member profile",
    summary:
      "The member area is designed to bring together application progress, account details and approved membership information.",
    badge: "Platform capability",
  },
  {
    eyebrow: "Club information",
    title: "Relevant supporter updates",
    summary:
      "Members can receive published news, event and match information when those records are confirmed by authorised editors.",
    badge: "Editorially controlled",
  },
  {
    eyebrow: "Community",
    title: "A route into participation",
    summary:
      "Verified chapter and community opportunities can be shared through the platform without exposing private member data.",
    badge: "Subject to availability",
  },
];

export const membershipCategoriesPage: PageContent = {
  eyebrow: "Membership",
  title: "Membership categories, awaiting formal approval.",
  summary:
    "A transparent framework for the categories, eligibility and terms the club may publish.",
  body: [
    "No official category names, fees, eligibility rules, renewal terms or benefits have been supplied for this platform. They should be confirmed by authorised club and finance representatives before applications rely on them.",
    "The application journey remains the source of any active category options. This public page will be updated when approved membership policy is available.",
  ],
  notice: editableNotice,
};

export const membershipCategoryCards: readonly PublicRouteCard[] = [
  {
    eyebrow: "Category framework",
    title: "Core supporter membership",
    summary:
      "A place for the club's approved standard membership description, eligibility, term and benefits.",
    badge: "Awaiting policy",
  },
  {
    eyebrow: "Category framework",
    title: "Youth or student membership",
    summary:
      "Any youth or student category requires approved age, evidence, consent and renewal requirements before publication.",
    badge: "Awaiting policy",
  },
  {
    eyebrow: "Category framework",
    title: "International membership",
    summary:
      "A future international category can set out approved chapter, eligibility and communication arrangements.",
    badge: "Awaiting policy",
  },
];

export const matchCalendarPage: PageContent = {
  eyebrow: "Match Centre",
  title: "The Eagles calendar, published only when confirmed.",
  summary:
    "A calendar view for officially verified fixtures, matchday windows and supporter updates.",
  body: [
    "No official fixture dates, opponents, venues or broadcast details have been confirmed for this platform. The records below are development placeholders, not travel or ticketing advice.",
    "Authorised editors can add confirmed calendar entries with the competition, kick-off time, venue and a clear update status.",
  ],
  notice: editableNotice,
};

export const supportersTravelPage: PageContent = {
  eyebrow: "Supporters' Travel",
  title: "Travel together, with official guidance first.",
  summary:
    "A future source of approved supporter travel information for selected matches and events.",
  body: [
    "SESC has not supplied any approved travel packages, meeting points, ticketing arrangements, prices or providers for publication. Do not make travel plans from this development page.",
    "When an authorised travel plan exists, this route can provide verified guidance, accessibility information, safety expectations and the correct booking or contact route.",
  ],
  notice: editableNotice,
};

export const supporterTravelCards: readonly PublicRouteCard[] = [
  {
    eyebrow: "Before travel",
    title: "Confirm the official match record",
    summary:
      "Fixture, venue and supporter arrangements should be checked against an authorised Match Centre update before any plans are made.",
    badge: "Guidance framework",
  },
  {
    eyebrow: "On the day",
    title: "Clear, accessible information",
    summary:
      "Approved travel notices can include meeting guidance, accessibility considerations and safe conduct expectations.",
    badge: "To be confirmed",
  },
  {
    eyebrow: "Your information",
    title: "Privacy-aware coordination",
    summary:
      "Any future trip registration should collect only the information needed for an approved supporter arrangement.",
    badge: "Planned capability",
  },
];

export const communityPage: PageContent = {
  eyebrow: "Community & CSR",
  title: "Supporter pride that reaches beyond matchday.",
  summary:
    "A home for approved community activity, chapter-led service and responsible supporter initiatives.",
  body: [
    "No current community project, beneficiary, partnership or outcome is asserted on this development page. Published stories will require approved details and appropriate consent.",
    "The platform is ready to connect verified chapter activity, volunteering opportunities and community updates in one accessible public space.",
  ],
  notice: editableNotice,
};

export const communityPillars: readonly PublicRouteCard[] = [
  {
    eyebrow: "Connection",
    title: "Supporters who organise together",
    summary:
      "Verified chapters can share approved local activity and help supporters find a credible way to participate.",
    badge: "Chapter-led",
  },
  {
    eyebrow: "Service",
    title: "Community action with care",
    summary:
      "Future CSR initiatives can explain their purpose, partners and outcomes without overstating unverified impact.",
    badge: "Editorial framework",
  },
  {
    eyebrow: "Culture",
    title: "Responsible supporter pride",
    summary:
      "Published guidance can reinforce respect, inclusion and the positive spirit of Nigerian football support.",
    badge: "Club values",
  },
];

export const sponsorsPage: PageContent = {
  eyebrow: "Sponsors & Partners",
  title: "Partnerships that strengthen the supporters' community.",
  summary:
    "A clear public home for approved sponsors, strategic partners and the contribution each is authorised to share.",
  body: [
    "Sponsor names, logo rights, commercial descriptions and public links must be verified before publication. This page does not imply a sponsorship relationship that has not been approved.",
    "The current platform records a confirmed technology implementation partnership and provides an editable structure for future sponsor categories.",
  ],
  notice: editableNotice,
};

export const sponsorCards: readonly PublicRouteCard[] = [
  {
    eyebrow: "Approved partnership",
    title: "TOPSBORG Technologies Limited",
    summary:
      "Official technology implementation partner for the SESC web platform under a Goods/Services Sponsorship Agreement.",
    badge: "Technology partner",
    href: "/partners/topsborg-technologies",
    linkLabel: "View partnership",
  },
  {
    eyebrow: "Sponsor directory",
    title: "Future sponsor profiles",
    summary:
      "Approved sponsor records can include a consistent logo treatment, authorised description and verified public destination.",
    badge: "Awaiting records",
  },
  {
    eyebrow: "Partner categories",
    title: "A structured partnership directory",
    summary:
      "Media, travel, institutional and event partner categories can be introduced only after the club approves each record.",
    badge: "Editable structure",
  },
];

export const sponsorshipOpportunitiesPage: PageContent = {
  eyebrow: "Sponsorship Opportunities",
  title: "Build an approved partnership with purpose.",
  summary:
    "A transparent outline for future sponsorship conversations, subject to official club terms and contact details.",
  body: [
    "SESC has not supplied sponsorship packages, pricing, audiences, inventories, benefits or a public enquiry contact for this platform. Nothing on this page is a commercial offer.",
    "When approved information is available, authorised editors can publish clear opportunities with scope, suitability, rights, responsibilities and a verified route for enquiries.",
  ],
  notice: editableNotice,
};

export const sponsorshipOpportunityCards: readonly PublicRouteCard[] = [
  {
    eyebrow: "Opportunity framework",
    title: "Community impact",
    summary:
      "A future category for approved programmes that support verified community or chapter activity.",
    badge: "Not a live package",
  },
  {
    eyebrow: "Opportunity framework",
    title: "Matchday and travel support",
    summary:
      "A future category for approved supporter information, travel or event activity with clear terms and safeguards.",
    badge: "Not a live package",
  },
  {
    eyebrow: "Opportunity framework",
    title: "Digital and media collaboration",
    summary:
      "A future category for authorised platform, media or content collaboration, with all public claims confirmed first.",
    badge: "Not a live package",
  },
];

export interface NewsCategory extends PageContent {
  readonly slug: string;
  readonly articleSlugs: readonly string[];
}

export const newsCategories: readonly NewsCategory[] = [
  {
    slug: "club-updates",
    eyebrow: "News category",
    title: "Club updates",
    summary:
      "Approved announcements and editorial structures relating to the supporters' club.",
    body: [
      "This category currently contains safe demonstration content. Published club updates will require a named editorial source, approval status and any necessary context before release.",
    ],
    notice: editableNotice,
    articleSlugs: ["editorial-club-update-demo"],
  },
  {
    slug: "community",
    eyebrow: "News category",
    title: "Community stories",
    summary:
      "Approved stories about chapters, supporter culture and community participation.",
    body: [
      "This category is an editorial framework. Any real chapter, participant or community story must be reviewed for accuracy, consent and appropriate public detail before publication.",
    ],
    notice: editableNotice,
    articleSlugs: ["chapter-community-story-demo"],
  },
];

export function getNewsCategory(slug: string): NewsCategory | undefined {
  return newsCategories.find((category) => category.slug === slug);
}
