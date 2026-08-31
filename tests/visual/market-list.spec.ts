import { expect, test } from "@playwright/test";
import { expectGenuinelyVisible, stubApi } from "./support";

/**
 * VR-1 — the row's queryable contract and its state surfaces, pinned BEFORE the
 * restructure so a dense-rows rewrite cannot quietly drop a field or a state.
 */

test("a market row keeps every field the card carried", async ({ page }) => {
  await stubApi(page);
  await page.goto("/");

  const row = page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first();
  // The list sits below the rail at narrow width since 007; scroll to it first.
  await row.scrollIntoViewIfNeeded();
  await expectGenuinelyVisible(row, "market row");

  const text = (await row.textContent()) ?? "";
  expect(text, "question").toMatch(/Tirante vs Adrian Mannarino/);
  expect(text, "both outcome labels").toMatch(/Thiago Agustin Tirante/);
  expect(text, "outcome price").toMatch(/9%/);
  expect(text, "24h volume").toMatch(/24h/);
  expect(text, "total volume").toMatch(/total/);
  expect(text, "end date").toMatch(/Ends/);
});

test("the row's question is reachable as a heading", async ({ page }) => {
  await stubApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Tirante/i })).toBeVisible();
});

test("the selected row is distinguishable by more than colour", async ({ page }) => {
  await stubApi(page);
  await page.goto("/");

  const rows = page.getByRole("region", { name: "Markets" }).getByRole("button");

  // 007 opens on the FIRST row, and that default is itself carried as accessible
  // state rather than only as a tint.
  await expect(rows.first()).toHaveAttribute("aria-pressed", "true");

  // The transition is exercised on a row that is not already selected.
  const other = rows.nth(1);
  await expect(other).toHaveAttribute("aria-pressed", "false");
  await other.scrollIntoViewIfNeeded();
  await other.click();

  // An accessible state, not only a border colour (VR-1).
  await expect(other).toHaveAttribute("aria-pressed", "true");
  await expect(rows.first()).toHaveAttribute("aria-pressed", "false");
});

test("the outcome bar reflects the prices shown", async ({ page }) => {
  await stubApi(page);
  await page.goto("/");

  const bar = page.getByTestId("outcome-bar").first();
  await expect(bar).toBeVisible();
  const widths = await bar.evaluate((el) =>
    Array.from(el.children).map((c) => (c as HTMLElement).getBoundingClientRect().width),
  );
  expect(widths.length).toBeGreaterThan(1);
  // Fixture market is 9% / 91%: the second segment must dominate.
  expect(widths[1]).toBeGreaterThan(widths[0] * 5);
});

test.describe("list states stay visible in the new layout", () => {
  test("empty", async ({ page }) => {
    await page.route("**/api/markets*", (r) =>
      r.fulfill({ json: { markets: [], nextCursor: null } }),
    );
    await stubApi(page);
    await page.route("**/api/markets*", (r) =>
      r.fulfill({ json: { markets: [], nextCursor: null } }),
    );
    await page.goto("/");
    await expectGenuinelyVisible(page.getByText(/no open markets match/i), "empty state");
  });

  test("error", async ({ page }) => {
    await stubApi(page);
    await page.route("**/api/markets*", (r) =>
      r.fulfill({ status: 503, json: { error: "Market data is temporarily unavailable." } }),
    );
    await page.goto("/");
    await expectGenuinelyVisible(
      page.getByRole("alert").filter({ hasText: /unavailable/i }),
      "error state",
    );
  });

  test("stale", async ({ page }) => {
    await stubApi(page);
    await page.route("**/api/markets*", async (r) => {
      const res = { markets: [], nextCursor: null, stale: true };
      await r.fulfill({ json: res });
    });
    await page.goto("/");
    await expectGenuinelyVisible(
      page.getByRole("status").filter({ hasText: /cached prices/i }),
      "stale notice",
    );
  });
});
