import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { siteConfig } from "@/config/site";

import { ContentCard } from "./public-content";
import { TopsborgWebsiteLink } from "./topsborg-website-link";

describe("TopsborgWebsiteLink", () => {
  it("uses the centrally configured destination and secure sponsored-link attributes", () => {
    render(<TopsborgWebsiteLink showIcon>Visit website</TopsborgWebsiteLink>);

    const link = screen.getByRole("link", {
      name: "Visit TOPSBORG Technologies Limited website (opens in a new tab)",
    });

    expect(link).toHaveAttribute("href", siteConfig.partners.topsborg.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
    expect(link).toHaveTextContent("Visit website");
  });

  it("keeps the directory route and external website action as sibling links", () => {
    const { container } = render(
      <ContentCard
        additionalAction={<TopsborgWebsiteLink>Visit website</TopsborgWebsiteLink>}
        href="/partners/topsborg-technologies"
        summary="Approved partnership information."
        title={siteConfig.partners.topsborg.name}
      />,
    );

    expect(container.querySelectorAll("a a")).toHaveLength(0);
    expect(container.querySelector('a[href="/partners/topsborg-technologies"]')).toBeTruthy();
    expect(container.querySelector(`a[href="${siteConfig.partners.topsborg.url}"]`)).toBeTruthy();
  });
});
