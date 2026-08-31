/**
 * Appearance of everything 004 adds (004 / T22).
 *
 * jsdom performs no layout, so it cannot tell that a control is 20px tall, off
 * screen, or unreadable against its background. This runs a real browser.
 */
import { test, expect } from "@playwright/test";
import { stubApi, normalized, expectGenuinelyVisible, expectNotClipped } from "./support";

test.beforeEach(async ({ page }) => {
  await stubApi(page, { bettingAllowed: true, country: "MX" });
});

test("the sort control is visible and readable", async ({ page }) => {
  await page.goto("/");
  const sort = page.getByLabel(/sort markets/i);
  // Since 007 the rail leads at narrow width, so the list's controls are below
  // the fold on arrival — reached by scrolling, as a reader would.
  await sort.scrollIntoViewIfNeeded();
  await expectGenuinelyVisible(sort, "sort control");
  // The active ordering must be readable without opening anything (UX-2).
  await expect(sort).toHaveValue("hot");
});

test("Load more is visible, tappable and appends a page", async ({ page }) => {
  await page.goto("/");
  const more = page.getByRole("button", { name: /load more/i });

  // It sits at the end of the list by definition, so it legitimately needs
  // scrolling to — unlike a required field, which must not.
  await more.scrollIntoViewIfNeeded();
  await expectGenuinelyVisible(more, "load more");
  const box = await more.boundingBox();
  expect(box!.height, "load more: touch target").toBeGreaterThanOrEqual(44);

  await more.click();
  await expect(page.getByText(/Page 2 —/).first()).toBeVisible();
  // The first page is still there — the whole point of UX-1.
  await expect(page.getByRole("heading", { name: /Tirante/i }).first()).toBeVisible();
});

test("the retry label is visible when the assistant fails", async ({ page }) => {
  await page.route("**/api/assist*", (route) =>
    route.fulfill({ status: 503, json: { error: "AI assistance is briefly unavailable." } }),
  );
  await page.goto("/");

  await page.getByLabel(/what are you interested in/i).fill("the fed meeting");
  await page.getByRole("button", { name: /get suggestions/i }).click();

  const retry = page.getByRole("button", { name: /try again/i });
  await expectGenuinelyVisible(retry, "assist retry");
  const box = await retry.boundingBox();
  expect(box!.height, "assist retry: touch target").toBeGreaterThanOrEqual(44);
  // And the typed prompt is still there to retry with.
  await expect(page.getByLabel(/what are you interested in/i)).toHaveValue("the fed meeting");
});

test("a demo position shows its cost and value without clipping", async ({ page }) => {
  // Read the fixture directly: issuing a request from inside a route handler
  // outlives the test and leaves a stray worker error behind.
  const m = normalized()[0];
  await page.unroute("**/api/quotes*");
  await page.route("**/api/quotes*", (route) =>
    route.fulfill({
      json: {
        quotes: {
          [m.id]: { closed: false, at: Date.now(), prices: { [m.outcomes[0].tokenId]: 0.5 } },
        },
      },
    }),
  );

  await page.goto("/");
  await page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first().click();
  await page.getByRole("button", { name: /Tirante · 9%/i }).click();
  await page.getByLabel(/amount/i).fill("20");
  await page.getByRole("button", { name: /review bet/i }).click();
  await page.getByRole("dialog", { name: /confirm your bet/i })
    .getByRole("button", { name: /place bet/i })
    .click();

  const panel = page.getByRole("region", { name: /demo positions/i });
  const totals = panel.getByTestId("position-totals");

  // The panel sits at the bottom of the column, so it legitimately needs
  // scrolling to — expectGenuinelyVisible forbids that by design, for required
  // fields. Scroll first, then hold it to the same standard.
  await totals.scrollIntoViewIfNeeded();
  await expectGenuinelyVisible(totals, "position totals");
  await expectNotClipped(totals, "position totals");
  // A rising figure must still read as practice money (Art. V).
  await expect(panel.getByTestId("position-totals")).toContainText("DEMO");
});

test("Escape closes the confirmation and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first().click();
  await page.getByRole("button", { name: /Tirante · 9%/i }).click();
  await page.getByLabel(/amount/i).fill("20");

  const review = page.getByRole("button", { name: /review bet/i });
  await review.click();
  await expect(page.getByRole("dialog", { name: /confirm your bet/i })).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.getByRole("dialog", { name: /confirm your bet/i })).toBeHidden();
  await expect(review).toBeFocused();
});

test("the empty rail explains itself on desktop and costs nothing on a phone", async ({ page }, testInfo) => {
  await page.goto("/");
  // 007 opens on a market, so the empty state is reached by clearing.
  await page.getByRole("button", { name: /^clear$/i }).click();
  const empty = page.getByRole("region", { name: /selected market/i });

  if (testInfo.project.name === "desktop") {
    // Beside the list it costs no vertical space, and an unexplained empty
    // column is worse than one that says why it is empty.
    await expectGenuinelyVisible(empty, "empty rail card");
  } else {
    // Above the list it costs the fold, which is the whole page on a phone.
    await expect(empty).toBeHidden();
  }

  // Either way the first market row is reachable without scrolling.
  const row = page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first();
  await expectGenuinelyVisible(row, "first market row");
});
