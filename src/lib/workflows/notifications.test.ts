import { describe, expect, it } from "vitest";

import { clampNotificationPageSize, isNotificationOwner, normalizeNotificationDraft } from "./notifications";

describe("notification safeguards", () => {
  it("keeps notification ownership user-scoped", () => {
    expect(isNotificationOwner("user-a", "user-a")).toBe(true);
    expect(isNotificationOwner("user-a", "user-b")).toBe(false);
  });

  it("normalizes deep links and paginates defensively", () => {
    expect(normalizeNotificationDraft({
      recipientUserId: "user-a",
      title: " Application received ",
      body: " Your application is queued. ",
      deepLink: "https://attacker.example",
    })).toMatchObject({
      title: "Application received",
      body: "Your application is queued.",
      deepLink: "/member",
    });
    expect(clampNotificationPageSize(500)).toBe(100);
    expect(clampNotificationPageSize(0)).toBe(1);
  });
});
