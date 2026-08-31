import { expect, test } from "@playwright/test";

/**
 * Proves the gate can do what jsdom cannot. If these fail, every other check in
 * this directory is meaningless — a suite that cannot measure layout would report
 * green while a field sat off-screen.
 */
test("the browser measures real layout", async ({ page }) => {
  await page.setContent(`<div id="probe" style="width:120px;height:44px"></div>`);
  const box = await page.locator("#probe").boundingBox();
  // jsdom returns zeroes here; a real engine does not.
  expect(box?.width).toBe(120);
  expect(box?.height).toBe(44);
});

test("the browser applies the cascade", async ({ page }) => {
  await page.setContent(
    `<style>.muted{color:#79828F}</style><span class="muted" id="t">x</span>`,
  );
  await expect(page.locator("#t")).toHaveCSS("color", "rgb(121, 130, 143)");
});

test("a clipped sr-only element is NOT treated as genuinely visible", async ({ page }) => {
  // The failure mode spec 002 names: toBeVisible() alone passes on this, which is
  // why the real checks also require a non-token bounding box.
  await page.setContent(
    `<span id="hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">payout</span>`,
  );
  const el = page.locator("#hidden");
  await expect(el).toBeVisible(); // documents the trap
  const box = await el.boundingBox();
  expect(box!.width).toBeLessThan(4);
  expect(box!.height).toBeLessThan(4); // ...and how we catch it
});
