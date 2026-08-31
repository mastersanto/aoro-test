import { test } from "@playwright/test";
import { expectGenuinelyVisible, stubApi } from "./support";

/**
 * VR-3 — the safety signals survive the reskin, and survive it *on screen*.
 */

test.describe("DEMO signalling", () => {
  test.beforeEach(async ({ page }) => {
    await stubApi(page);
    await page.goto("/");
  });

  test("the balance carries the demo signal", async ({ page }) => {
    await expectGenuinelyVisible(page.getByText(/practice balance/i), "DEMO balance");
  });

  test("the mode toggle is visible and shows which mode is active", async ({ page }) => {
    await expectGenuinelyVisible(
      page.getByRole("group", { name: /betting mode/i }),
      "money-mode toggle",
    );
  });

  test("a placed demo bet's result says so, on screen", async ({ page }) => {
    await page.getByRole("button", { name: /Tirante/i }).first().click();
    await page.getByRole("button", { name: /Tirante · 9%/i }).click();
    await page.getByLabel(/amount/i).fill("25");
    await page.getByRole("button", { name: /review bet/i }).click();
    await page.getByRole("dialog").getByRole("button", { name: /place bet/i }).click();

    await expectGenuinelyVisible(page.getByText(/DEMO bet placed/i), "demo result notice");
    await expectGenuinelyVisible(
      page.getByLabel(/demo positions/i),
      "demo positions panel",
    );
  });
});

test.describe("AI disclaimer (Art. V)", () => {
  test("is visible together with the suggestions it qualifies", async ({ page }) => {
    await stubApi(page);
    await page.goto("/");

    await page.getByLabel(/what are you interested in/i).fill("tennis");
    await page.getByRole("button", { name: /get suggestions/i }).click();

    await expectGenuinelyVisible(page.getByTestId("suggestion-0"), "first suggestion");
    // The point of the check: not merely present, but on screen with the advice.
    await expectGenuinelyVisible(page.getByText(/not financial advice/i), "disclaimer");
  });
});

test.describe("geo restriction (Art. V)", () => {
  test("the explanation is visible beside the disabled control", async ({ page }) => {
    await stubApi(page, { bettingAllowed: false, country: "US" });
    await page.goto("/");

    await page.getByRole("button", { name: /Tirante/i }).first().click();
    await page.getByRole("button", { name: /real money/i }).click();

    await expectGenuinelyVisible(page.getByText(/close-only here/i), "geo explanation");
  });
});
