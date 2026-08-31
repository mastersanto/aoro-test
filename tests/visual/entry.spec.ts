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

test("two market rows are fully visible on entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('article[role="button"]').first()).toBeVisible();

  const fullyVisible = await page.evaluate(() => {
    const vh = window.innerHeight;
    return Array.from(document.querySelectorAll('article[role="button"]')).filter((el) => {
      const b = el.getBoundingClientRect();
      // FULLY inside: a row overlapping the fold does not count, which is the
      // whole difference between this check and the one it replaces.
      return b.top >= 0 && b.bottom <= vh;
    }).length;
  });

  expect(fullyVisible, "market rows fully visible without scrolling").toBeGreaterThanOrEqual(2);
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
