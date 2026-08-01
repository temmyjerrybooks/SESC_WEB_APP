import { describe, expect, it } from "vitest";

import { contentEntryRequestSchema } from "./server-workflows";

const validNews = {
  kind: "news",
  status: "published",
  slug: "controlled-live-test",
  title: "Controlled live test",
  summary: "A structured article used for controlled online testing.",
  body: {
    eyebrow: "Platform update",
    paragraphs: ["This is a safe text paragraph."],
  },
  publicationAt: "2026-07-31T12:00:00.000+00:00",
};

describe("content entry request validation", () => {
  it("accepts a bounded text-only news article", () => {
    expect(contentEntryRequestSchema.safeParse(validNews).success).toBe(true);
  });

  it("rejects unstructured news bodies and invalid public timestamps", () => {
    expect(contentEntryRequestSchema.safeParse({
      ...validNews,
      body: { html: "<script>alert(1)</script>" },
    }).success).toBe(false);
    expect(contentEntryRequestSchema.safeParse({
      ...validNews,
      publicationAt: "not-a-timestamp",
    }).success).toBe(false);
  });
});
