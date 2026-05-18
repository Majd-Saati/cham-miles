import { test, expect, type Page } from "@playwright/test";

// Guarantees the welcome text never dips DOWN on the first scroll past the
// auto-scroll rest position (~p = 0.257). It must start sliding UP (negative
// translateY) immediately as scroll progress moves beyond rest.

const BASE_URL = process.env.PREVIEW_URL ?? "http://localhost:5173";
const REST = 0.257;

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: total * p, behavior: "auto" });
  }, progress);
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  );
}

async function readTranslateY(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("[data-welcome-overlay]");
    if (!el) throw new Error("welcome overlay not found");
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
    return m.m42; // translateY component in px
  });
}

test.describe("welcome text exits immediately on first scroll", () => {
  test("no downward dip past the rest position", async ({ page }) => {
    await page.setViewportSize({ width: 1324, height: 915 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(BASE_URL);
    await page.waitForSelector("[data-welcome-overlay]");

    // Cancel the on-mount auto-scroll so it doesn't fight our programmatic
    // scrollTo calls (it dies on any wheel/touch/key input).
    await page.evaluate(() => {
      window.dispatchEvent(new WheelEvent("wheel", { bubbles: true }));
    });
    await page.waitForTimeout(50);

    // Settle at the rest position (where auto-scroll lands).
    await scrollToProgress(page, REST);
    const restY = await readTranslateY(page);

    // Sample fine-grained progress values just past rest. The welcome text
    // must move UP (translateY strictly less-or-equal to restY, decreasing).
    const samples = [REST + 0.001, REST + 0.005, REST + 0.01, REST + 0.02, REST + 0.05, 0.35, 0.45];
    let prev = restY;
    for (const p of samples) {
      await scrollToProgress(page, p);
      const y = await readTranslateY(page);
      // Must not go DOWN compared to rest — i.e. y <= restY (with 0.5px tol).
      expect(
        y,
        `welcome text dipped DOWN at p=${p.toFixed(3)}: y=${y.toFixed(2)} > restY=${restY.toFixed(2)}`,
      ).toBeLessThanOrEqual(restY + 0.5);
      // Must be monotonically non-increasing (no oscillation back down).
      expect(
        y,
        `welcome text moved DOWN between samples at p=${p.toFixed(3)}: y=${y.toFixed(2)} > prev=${prev.toFixed(2)}`,
      ).toBeLessThanOrEqual(prev + 0.5);
      prev = y;
    }

    // Final sanity: by p=0.45 the text should have moved meaningfully upward.
    expect(prev).toBeLessThan(restY - 50);
  });
});