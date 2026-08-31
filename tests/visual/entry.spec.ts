/**
 * What you see when you arrive (006 / LE-1).
 *
 * 005 asserted the first market row "is genuinely visible", which a row sitting
 * flush on the fold satisfies — and that is exactly what shipped at 390px: one
 * market, its bottom 20px from the bottom edge, reading as the end of the page.
 *
 * This asserts two rows FULLY inside the viewport instead. Two, not one: one row
 * on the fold does not read as a list.
 */
import { test, expect } from "@playwright/test";
import { stubApi } from "./support";

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

/** Rows whose whole box is inside the viewport. A row overlapping the fold is not one. */
async function fullyVisibleRows(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    return Array.from(document.querySelectorAll('article[role="button"]')).filter((el) => {
      const b = el.getBoundingClientRect();
      return b.top >= 0 && b.bottom <= vh;
    }).length;
  });
}

test("the bet can be completed without scrolling on entry (007 / OM-1)", async ({ page }) => {
  // 007 opens on a market, so what must be reachable on arrival is the BET, not
  // the list. At 390px both cannot fit; a usable bet form beats a list nobody
  // asked for. At 1280px the list is a second column and both hold.
  await page.goto("/");
  const outcomes = page.getByRole("group", { name: /choose an outcome/i });
  await expect(outcomes).toBeVisible();

  for (const [el, what] of [
    [outcomes, "outcome controls"],
    [page.getByLabel(/amount/i), "amount field"],
    [page.getByRole("button", { name: /review bet/i }), "review control"],
  ] as const) {
    const box = await el.boundingBox();
    const vh = page.viewportSize()!.height;
    expect(box!.y, `${what}: starts below the fold`).toBeLessThan(vh);
    expect(box!.y + box!.height, `${what}: extends below the fold`).toBeLessThanOrEqual(vh);
  }
});

test("two market rows are fully visible with nothing selected", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('article[role="button"]').first()).toBeVisible();

  // Reached by clearing, since 007 opens on a market.
  await page.getByRole("button", { name: /^clear$/i }).click();
  await expect(page.getByRole("group", { name: /choose an outcome/i })).toBeHidden();

  expect(
    await fullyVisibleRows(page),
    "market rows fully visible without scrolling",
  ).toBeGreaterThanOrEqual(2);
});

test("the geo explanation survives the space it gave up (Art. V)", async ({ page }) => {
  await page.goto("/");

  // Shortened, not hidden: it must still name the region and refuse real betting.
  const notice = page.getByRole("status").filter({ hasText: /unavailable/i }).first();
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/US/);

  // And still beside the mode toggle (003 AR-5), not moved into the rail.
  const toggle = page.getByRole("group", { name: /betting mode/i });
  const [n, t] = await Promise.all([notice.boundingBox(), toggle.boundingBox()]);
  expect(Math.abs(n!.y - t!.y), "geo notice sits on the mode toggle's row").toBeLessThan(140);
});

test("every category filter is still reachable (001 US-1)", async ({ page }) => {
  await page.goto("/");
  const group = page.getByRole("group", { name: /filter by category/i });
  const buttons = group.getByRole("button");
  const n = await buttons.count();
  expect(n, "category count").toBeGreaterThan(3);

  // A scrolling row must not strand any of them.
  for (let i = 0; i < n; i += 1) {
    await buttons.nth(i).scrollIntoViewIfNeeded();
    await expect(buttons.nth(i)).toBeVisible();
    const box = await buttons.nth(i).boundingBox();
    expect(box!.height, `category ${i}: touch target`).toBeGreaterThanOrEqual(44);
  }
});
