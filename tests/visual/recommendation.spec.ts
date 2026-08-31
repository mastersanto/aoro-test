import { expect, test } from "@playwright/test";
import { expectCoVisible, expectGenuinelyVisible, stubApi } from "./support";

/**
 * AR-2/AR-4 appearance (feature 003 T16). The counter-case must carry the same
 * weight as the case for — a one-sided argument is this feature's specific harm,
 * so prominence is measured rather than judged.
 */
test.beforeEach(async ({ page }) => {
  await stubApi(page);
  await page.goto("/");
  await page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first().click();

  // On a phone, selecting a market opens the bet sheet over the rail — that is
  // AR-7's design, not a bug. A user reads the recommendation by dismissing it,
  // so the test does the same rather than reaching through the overlay.
  const sheet = page.getByTestId("bet-sheet");
  if (await sheet.isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /close bet panel/i }).click();
    await sheet.waitFor({ state: "hidden" });
  }

  await page.getByRole("button", { name: /what would you favou?r/i }).click();
  await page.getByTestId("recommendation").waitFor();
});

test("the counter-case is visible with the case for", async ({ page }) => {
  await expectCoVisible(
    page.getByTestId("case-for"),
    page.getByTestId("case-against"),
    "case for and counter-case",
  );
});

test("the counter-case is set at the same type size as the case for", async ({ page }) => {
  const size = (t: string) =>
    page.getByTestId(t).evaluate((el) => getComputedStyle(el).fontSize);
  expect(await size("case-against")).toBe(await size("case-for"));
});

test("neither is collapsed, truncated, or behind an interaction", async ({ page }) => {
  for (const id of ["case-for", "case-against"]) {
    const el = page.getByTestId(id);
    await expect(el).toBeVisible();
    // Not inside a closed disclosure.
    expect(await el.evaluate((n) => Boolean(n.closest("details:not([open])")))).toBe(false);
    // Not clipped.
    expect(await el.evaluate((n) => n.scrollHeight - n.clientHeight)).toBeLessThanOrEqual(1);
  }
});

test("the disclaimer is visible with the recommendation it qualifies", async ({ page }) => {
  await expectCoVisible(
    page.getByTestId("case-for"),
    page.getByText(/not financial advice/i),
    "recommendation and its disclaimer",
  );
});

test("the market it concerns is named on screen", async ({ page }) => {
  // 005 / DR-3 states the market once, in the rail's header card. The
  // requirement 003 wrote — a recommendation is never read detached from its
  // market — is now a co-visibility claim rather than a repeated line.
  await expectCoVisible(
    page.getByTestId("recommendation"),
    page.getByRole("region", { name: /selected market/i }),
    "recommendation and the market it concerns",
  );
});
