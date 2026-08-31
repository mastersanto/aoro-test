import { test } from "@playwright/test";
import { expectCoVisible, expectGenuinelyVisible, stubApi } from "./support";

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
    await page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first().click();
    await page.getByRole("button", { name: /Tirante · 9%/i }).click();
    await page.getByLabel(/amount/i).fill("25");
    await page.getByRole("button", { name: /review bet/i }).click();
    await page
      .getByRole("dialog", { name: /confirm your bet/i })
      .getByRole("button", { name: /place bet/i })
      .click();

    await expectGenuinelyVisible(page.getByText(/DEMO bet placed/i), "demo result notice");
    // The position row must carry the demo signal wherever it is read.
    await expectCoVisible(
      page.getByLabel(/demo positions/i),
      page.getByText(/no real money involved/i),
      "demo position and its DEMO label",
    );
  });
});

test.describe("AI disclaimer (Art. V)", () => {
  test("is visible together with the suggestions it qualifies", async ({ page }) => {
    await stubApi(page);
    await page.goto("/");

    await page.getByLabel(/what are you interested in/i).fill("tennis");
    await page.getByRole("button", { name: /get suggestions/i }).click();

    // The guarantee is co-visibility: the advice can never be read with its
    // qualifier off-screen. Not "the panel sits above the fold", which would be
    // a layout mandate the spec does not make.
    await expectCoVisible(
      page.getByTestId("suggestion-0"),
      page.getByText(/not financial advice/i),
      "suggestion and its disclaimer",
    );
  });
});

test.describe("geo restriction (Art. V)", () => {
  test("the explanation is visible beside the disabled control", async ({ page }) => {
    await stubApi(page, { bettingAllowed: false, country: "US" });
    await page.goto("/");

    await page.getByRole("region", { name: "Markets" }).getByRole("button", { name: /Tirante/i }).first().click();
    await page.getByRole("button", { name: /real money/i }).click();

    await expectGenuinelyVisible(page.getByText(/close-only here/i), "geo explanation");
  });
});
