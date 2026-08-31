import { expect, type Locator, type Page } from "@playwright/test";
import fixture from "../fixtures/gamma-keyset.json";

/**
 * One definition of "visible", used by every check in this suite (spec 002).
 *
 * `toBeVisible()` alone is not enough: it returns true for a 1x1 clipped
 * sr-only element, and it does not require the element to be inside the
 * viewport. Both are failure modes the spec names explicitly.
 */
export async function expectGenuinelyVisible(locator: Locator, what: string) {
  await expect(locator, `${what}: not visible`).toBeVisible();

  const box = await locator.boundingBox();
  expect(box, `${what}: has no layout box`).not.toBeNull();
  // A clipped sr-only element has a box, but a token one.
  expect(box!.width, `${what}: width is token-sized (hidden?)`).toBeGreaterThan(4);
  expect(box!.height, `${what}: height is token-sized (hidden?)`).toBeGreaterThan(4);

  const view = locator.page().viewportSize()!;
  expect(box!.y, `${what}: starts above the viewport`).toBeGreaterThanOrEqual(0);
  expect(box!.x, `${what}: starts left of the viewport`).toBeGreaterThanOrEqual(0);
  expect(
    box!.y + box!.height,
    `${what}: extends below the fold — requires scrolling`,
  ).toBeLessThanOrEqual(view.height);
  expect(
    box!.x + box!.width,
    `${what}: extends past the right edge`,
  ).toBeLessThanOrEqual(view.width);
}

/** Text that is ellipsised is still fully present in the DOM — check geometry. */
export async function expectNotClipped(locator: Locator, what: string) {
  const overflow = await locator.evaluate(
    (el) => el.scrollWidth - el.clientWidth,
  );
  expect(overflow, `${what}: text is clipped/ellipsised`).toBeLessThanOrEqual(1);
}

const markets = fixture.markets;

/**
 * Stub the app's own routes so the suite needs no API key, no live model call
 * and no network. Geo is stubbed per test because US-5's two states matter.
 */
export async function stubApi(
  page: Page,
  opts: { bettingAllowed?: boolean; country?: string } = {},
) {
  const { bettingAllowed = false, country = "US" } = opts;

  await page.route("**/api/markets*", (route) =>
    route.fulfill({
      json: { markets: normalized(), nextCursor: null, stale: false },
    }),
  );

  await page.route("**/api/geo*", (route) =>
    route.fulfill({
      json: bettingAllowed
        ? { country, bettingAllowed: true }
        : {
            country,
            bettingAllowed: false,
            reason:
              "New bets are not available in your region — Polymarket's main exchange is close-only here. You can still browse markets, use AI assistance, and practise in demo mode.",
          },
    }),
  );

  await page.route("**/api/assist*", (route) =>
    route.fulfill({
      json: {
        suggestions: [
          {
            market: normalized()[0],
            outcome: normalized()[0].outcomes[0],
            reasoning: "The book prices this near 9%, which reflects the seeding.",
          },
        ],
      },
    }),
  );

  await page.route("**clob.polymarket.com/**", (route) =>
    route.fulfill({ json: { price: "0.09" } }),
  );
}

function normalized() {
  return markets.map((m) => ({
    id: m.id,
    question: m.question,
    slug: m.slug,
    outcomes: (JSON.parse(m.outcomes) as string[]).map((label, i) => ({
      label,
      price: Number((JSON.parse(m.outcomePrices) as string[])[i]),
      tokenId: (JSON.parse(m.clobTokenIds) as string[])[i],
    })),
    volume: Number(m.volume),
    volume24hr: Number(m.volume24hr),
    liquidity: Number(m.liquidity),
    endDate: m.endDate,
    bestBid: m.bestBid,
    bestAsk: m.bestAsk,
    active: m.active,
    closed: m.closed,
    restricted: m.restricted,
  }));
}

/** Drive the UI to an open confirmation dialog, the way a user would. */
export async function openConfirmation(page: Page) {
  await page.goto("/");
  const row = page.getByRole("button", { name: /Tirante/i }).first();
  await row.click();
  await page.getByRole("button", { name: /Tirante · 9%/i }).click();
  await page.getByLabel(/amount/i).fill("90");
  await page.getByRole("button", { name: /review bet/i }).click();
  return page.getByRole("dialog");
}
