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
    readiness: {
      features: {
        authentication: expect.any(String),
        membershipApplications: expect.any(String),
      },
    },
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

test("newsletter preview rejects email collection until delivery controls are configured", async ({ request }) => {
  const response = await request.post("/api/newsletter", {
    data: { email: "person@example.test" },
  });

  expect(response.status()).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    message: expect.stringMatching(/not available/i),
  });
});

test("mobile navigation restores focus and does not overflow at the smallest supported viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const menuButton = page.getByRole("button", { name: "Open navigation" });
  await menuButton.click();
  const dialog = page.getByRole("dialog", { name: "Mobile navigation" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("link", { name: /^03 Membership$/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(menuButton).toBeFocused();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("unknown public routes render the safe 404 boundary", async ({ page }) => {
  await page.goto("/this-route-does-not-exist", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "This page is not in the squad." })).toBeVisible();
});

test("production portal requests fail closed when readiness is unavailable", async ({ page }) => {
  test.skip(
    !process.env.PLAYWRIGHT_BASE_URL && process.env.PLAYWRIGHT_PRODUCTION !== "true",
    "This assertion exercises the production server configuration gate.",
  );

  await page.goto("/member", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/maintenance\?reason=configuration$/);
});
