import { expect, test, type Locator } from "@playwright/test";

import { siteConfig } from "../src/config/site";

const topsborgUrl = siteConfig.partners.topsborg.url;
const productionServerRun =
  Boolean(process.env.PLAYWRIGHT_BASE_URL) ||
  process.env.PLAYWRIGHT_PRODUCTION === "true";

const responsiveViewports = [
  { name: "small mobile", width: 320, height: 568 },
  { name: "mobile", width: 390, height: 844 },
  { name: "large mobile", width: 430, height: 932 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "tablet landscape", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function expectVerifiedTopsborgLink(link: Locator) {
  await expect(link).toHaveAttribute("href", topsborgUrl);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "sponsored noopener noreferrer");
  await expect(link).toHaveAttribute(
    "aria-label",
    "Visit TOPSBORG Technologies Limited website (opens in a new tab)",
  );
}

test("publishes the approved TOPSBORG website across public and authentication placements", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const homePartner = page.locator('[aria-labelledby="home-partners-title"]');
  await expect(homePartner).toContainText(siteConfig.partners.topsborg.name);
  await expectVerifiedTopsborgLink(homePartner.locator('a[href="' + topsborgUrl + '"]'));
  await expectVerifiedTopsborgLink(
    page.locator('footer.site-footer a[href="' + topsborgUrl + '"]'),
  );

  await page.goto("/partners", { waitUntil: "domcontentloaded" });
  const partnerCard = page
    .locator("article")
    .filter({ hasText: siteConfig.partners.topsborg.name });
  await expect(partnerCard).toBeVisible();
  await expectVerifiedTopsborgLink(partnerCard.locator('a[href="' + topsborgUrl + '"]'));
  await expect(partnerCard.locator('a[href="/partners/topsborg-technologies"]')).toBeVisible();
  await expect(page.locator("a a")).toHaveCount(0);

  await Promise.all([
    page.waitForURL(/\/partners\/topsborg-technologies$/, { timeout: 30_000 }),
    partnerCard.locator('a[href="/partners/topsborg-technologies"]').click(),
  ]);
  const detailCta = page.locator(
    '[aria-labelledby="topsborg-partnership-purpose"] a.button[href="' +
      topsborgUrl +
      '"]',
  );
  await expect(detailCta).toHaveText("Visit TOPSBORG Technologies");
  await expectVerifiedTopsborgLink(detailCta);
  await expect(page.locator("a a")).toHaveCount(0);

  await Promise.all([
    page.waitForURL(/\/partners$/, { timeout: 30_000 }),
    page.getByRole("link", { name: "Back to partners" }).click(),
  ]);

  await page.goto("/sponsors", { waitUntil: "domcontentloaded" });
  const sponsorCard = page
    .locator("article")
    .filter({ hasText: siteConfig.partners.topsborg.name });
  await expect(sponsorCard).toBeVisible();
  await expectVerifiedTopsborgLink(sponsorCard.locator('a[href="' + topsborgUrl + '"]'));
  await expect(sponsorCard.locator('a[href="/partners/topsborg-technologies"]')).toBeVisible();
  await expect(page.locator("a a")).toHaveCount(0);

  for (const route of ["/login", "/register"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expectVerifiedTopsborgLink(
      page.locator('footer.site-footer a[href="' + topsborgUrl + '"]'),
    );
  }
});

test("shows the technology credit in each development portal preview", async ({ page }) => {
  test.skip(
    productionServerRun,
    "Production intentionally keeps portal previews unavailable.",
  );

  for (const route of ["/member", "/executive", "/admin"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const credit = page.getByTestId("portal-technology-credit");
    await expect(credit).toBeVisible();
    await expectVerifiedTopsborgLink(credit.locator('a[href="' + topsborgUrl + '"]'));
  }
});

test("keeps TOPSBORG placements responsive and free of hydration failures", async ({ page }) => {
  test.setTimeout(360_000);
  const runtimeErrors: string[] = [];
  const hydrationMessages: string[] = [];

  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /(hydration|did not match|mismatch)/i.test(message.text())
    ) {
      hydrationMessages.push(message.text());
    }
  });

  for (const viewport of responsiveViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of [
      "/",
      "/partners/topsborg-technologies",
      "/partners",
      "/sponsors",
      "/login",
      "/register",
    ]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator('a[href="' + topsborgUrl + '"]').first()).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    }
  }

  expect(runtimeErrors).toEqual([]);
  expect(hydrationMessages).toEqual([]);
});
