import { expect, test } from "@playwright/test";

test("public home page exposes the primary membership route", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(/Super Eagles Supporters Club of Nigeria/i);
  await expect(
    page.getByRole("heading", { name: /The voice behind the Eagles/i }),
  ).toBeVisible();
  await expect(
    page.locator(".home-hero").getByRole("link", { name: "Explore membership" }),
  ).toBeVisible();
});

test("health endpoint reports the application status", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "sesc-web-app",
  });
});

test("membership preview rejects personal-data submissions until the secure workflow is live", async ({ request }) => {
  const response = await request.post("/api/membership/applications", {
    data: {
      email: "person@example.test",
      paymentReference: "not-a-real-reference",
    },
  });

  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    message: expect.stringMatching(/not open yet/i),
  });
});

test("contact preview rejects personal-data submissions until official delivery is configured", async ({ request }) => {
  const response = await request.post("/api/contact", {
    data: {
      email: "person@example.test",
      message: "This must not be accepted by the preview.",
    },
  });

  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    message: expect.stringMatching(/not available/i),
  });
});
