import { expect, test } from "@playwright/test";
import { expectGenuinelyVisible, expectNotClipped, openConfirmation, stubApi } from "./support";

/**
 * VR-2 — the confirmation stays fully visible.
 * jsdom cannot judge any of this: it performs no layout, so a field pushed
 * below the fold or ellipsised passes every assertion in the behavior suite.
 */
test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

test("all five mandated fields are genuinely visible at once", async ({ page }) => {
  const dialog = await openConfirmation(page);

  await expectGenuinelyVisible(dialog.getByText(/Tirante vs/i), "market question");
  await expectGenuinelyVisible(dialog.getByTestId("confirm-outcome"), "outcome");
  await expectGenuinelyVisible(dialog.getByTestId("confirm-amount"), "amount");
  await expectGenuinelyVisible(dialog.getByTestId("confirm-price"), "price");
  await expectGenuinelyVisible(dialog.getByTestId("confirm-payout"), "estimated payout");
});

test("the market question is rendered in full, not ellipsised", async ({ page }) => {
  const dialog = await openConfirmation(page);
  // `truncate` leaves the whole string in the DOM, so text assertions cannot
  // catch this — only geometry can.
  await expectNotClipped(dialog.getByText(/Tirante vs/i), "market question");
});

test("no field is reachable only by scrolling the dialog", async ({ page }) => {
  const dialog = await openConfirmation(page);
  const overflow = await dialog.evaluate(
    (el) => el.scrollHeight - el.clientHeight,
  );
  expect(overflow, "confirmation scrolls — fields are not simultaneously visible").toBeLessThanOrEqual(1);
});

test("the demo signal is visible in the confirmation itself", async ({ page }) => {
  const dialog = await openConfirmation(page);
  await expectGenuinelyVisible(dialog.getByText(/DEMO/i).first(), "DEMO badge in confirmation");
});
