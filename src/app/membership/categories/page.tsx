import { ContentCard, SectionHeading, StandardPage } from "@/components/public-content";
import {
  membershipCategoriesPage,
  membershipCategoryCards,
} from "@/data/additional-public-content";
import { createPageMetadata } from "@/data/site-content";

export const metadata = createPageMetadata(membershipCategoriesPage.title, membershipCategoriesPage.summary);

export default function MembershipCategoriesPage() {
  return (
    <StandardPage
      actions={[
        { href: "/membership/apply", label: "Application availability" },
        { href: "/membership/benefits", label: "Explore benefits", variant: "secondary" },
      ]}
      content={membershipCategoriesPage}
    >
      <section aria-labelledby="membership-categories-title" className="section section--tight">
        <SectionHeading
          copy="The categories below are editable structures, not active plans or terms."
          id="membership-categories-title"
          title="Categories ready for official policy."
        />
        <div className="content-grid content-grid--three">
          {membershipCategoryCards.map((category) => (
            <ContentCard
              badge={category.badge}
              eyebrow={category.eyebrow}
              key={category.title}
              summary={category.summary}
              title={category.title}
            />
          ))}
        </div>
      </section>
    </StandardPage>
  );
}
