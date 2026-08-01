import { describe, expect, it } from "vitest";

import { siteConfig } from "./site";

describe("siteConfig.partners.topsborg", () => {
  it("stores the approved TOPSBORG partnership details in one place", () => {
    expect(siteConfig.partners.topsborg).toStrictEqual({
      name: "TOPSBORG Technologies Limited",
      shortName: "TOPSBORG Technologies",
      role: "Official Technology Partner",
      agreement: "Goods/Services Sponsorship Agreement",
      url: "https://topsborgtech.com",
    });
  });
});
