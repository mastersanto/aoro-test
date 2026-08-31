import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { openConfirmation, stubApi } from "./support";

/** VR-4 / VR-5 / VR-3 — the guarantees that are measured, not eyeballed. */

test.beforeEach(async ({ page }) => {
  await stubApi(page);
});

async function contrastViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`),
  );
}

test.describe("VR-5 contrast", () => {
  test("the browsing surface has no contrast violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Tirante/i }).first().waitFor();
    expect(await contrastViolations(page)).toEqual([]);
  });

  test("the confirmation has no contrast violations", async ({ page }) => {
    await openConfirmation(page);
    expect(await contrastViolations(page)).toEqual([]);
  });

  test("the assist panel has no contrast violations", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/what are you interested in/i).fill("tennis");
    await page.getByRole("button", { name: /get suggestions/i }).click();
    await page.getByTestId("suggestion-0").waitFor();
    expect(await contrastViolations(page)).toEqual([]);
  });
});

test.describe("VR-4 touch targets and overflow", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 390, "phone-only criteria");

  test("every interactive control is at least 44px tall", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Tirante/i }).first().waitFor();

    const small: string[] = [];
    for (const el of await page.locator("button, a, input, textarea, select").all()) {
      if (!(await el.isVisible())) continue;
      const box = await el.boundingBox();
      if (!box) continue;
      if (box.height < 44) {
        small.push(`${(await el.textContent())?.trim().slice(0, 28) || "(no text)"} = ${Math.round(box.height)}px`);
      }
    }
    expect(small, "controls below the 44px touch floor").toEqual([]);
  });

  test("the page does not scroll horizontally", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Tirante/i }).first().waitFor();
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement!;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow, "page scrolls sideways at 390px").toBeLessThanOrEqual(1);
  });
});

test.describe("VR-3 signals that must not rely on colour", () => {
  test("the demo colour is used by nothing that is not a demo signal", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Tirante/i }).first().waitFor();

    // Any element painted in the demo hue must itself say DEMO (or sit inside
    // something that does). Otherwise the signal stops meaning one thing.
    const offenders = await page.evaluate(() => {
      const isDemoHue = (c: string) => {
        const m = c.match(/\d+/g);
        if (!m) return false;
        const [r, g, b] = m.map(Number);
        return r > 200 && g > 140 && g < 220 && b < 120; // amber family
      };
      const bad: string[] = [];
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const s = getComputedStyle(el);
        if (!isDemoHue(s.color) && !isDemoHue(s.backgroundColor)) continue;
        const text = (el.closest("[data-demo], section, aside, p, div")?.textContent ?? "").toUpperCase();
        if (!text.includes("DEMO")) {
          bad.push(`${el.tagName.toLowerCase()}.${el.className.toString().slice(0, 40)}`);
        }
      }
      return bad;
    });
    expect(offenders, "demo colour used on a non-demo surface").toEqual([]);
  });

  test("each outcome shows its label in full, not by colour or abbreviation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Tirante/i }).first().click();

    const group = page.getByRole("group", { name: /choose an outcome/i });
    const labels = (await group.getByRole("button").allTextContents()).map((t) => t.trim());
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      // The full outcome name, not "Tir." or "Y".
      expect(label, `outcome button abbreviated: ${label}`).toMatch(
        /Thiago Agustin Tirante|Adrian Mannarino/,
      );
    }
  });
});
