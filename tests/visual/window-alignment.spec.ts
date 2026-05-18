import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { fileURLToPath } from "node:url";
function cropToSize(png: PNG, w: number, h: number): PNG {
  if (png.width === w && png.height === h) return png;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (y * png.width + x) << 2;
      const di = (y * w + x) << 2;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Visual regression: snapshot the cabin <Window> and its inner shadow at
// key scroll positions and confirm they share identical bounding boxes plus
// pixel-diff against committed baselines.

const BASE_URL = process.env.PREVIEW_URL ?? "http://localhost:5173";
const SCROLL_SAMPLES: { name: string; progress: number }[] = [
  { name: "start", progress: 0.22 }, // window fully open, before zoom-out
  { name: "mid", progress: 0.5 },    // mid zoom-out, exterior fading in
  { name: "end", progress: 0.85 },   // closing message visible
];
const BOX_TOL_PX = 1;       // alignment tolerance (window vs inner shadow)
const PIXEL_DIFF_TOL = 0.01; // 1% diff vs baseline

const baselineDir = path.join(__dirname, "__baselines__");
const outDir = path.join(__dirname, "__output__");
fs.mkdirSync(baselineDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    const scene = document.querySelector<HTMLDivElement>("[data-scene], .relative.w-full > div");
    // Match the SCENE_VH = 800vh height used by WindowParallex.
    const total = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: total * p, behavior: "auto" });
    void scene;
  }, progress);
  // wait two frames for parallax + transitions to settle
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  );
  await page.waitForTimeout(250);
}

test.describe("WindowParallex alignment", () => {
  for (const sample of SCROLL_SAMPLES) {
    test(`window + inner shadow align @ ${sample.name}`, async ({ page }) => {
      await page.setViewportSize({ width: 1324, height: 915 });
      await page.goto(BASE_URL);
      await page.waitForSelector("[data-window-inner]");
      await scrollToProgress(page, sample.progress);

      // 1. Bounding-box alignment: the inner-shadow div should match its
      // parent window's inner box on all 4 edges.
      const boxes = await page.evaluate(() => {
        const wins = Array.from(
          document.querySelectorAll<HTMLElement>("[data-window-inner]"),
        );
        return wins.map((w) => {
          const wr = w.getBoundingClientRect();
          // The inner-shadow div is the last child overlay with the inset shadow class.
          const shadow = w.querySelector<HTMLElement>(
            'div[class*="shadow-[inset_2px_2px_5px"]',
          );
          const sr = shadow?.getBoundingClientRect();
          return {
            window: { top: wr.top, right: wr.right, bottom: wr.bottom, left: wr.left },
            shadow: sr
              ? { top: sr.top, right: sr.right, bottom: sr.bottom, left: sr.left }
              : null,
          };
        });
      });

      for (const [i, b] of boxes.entries()) {
        expect(b.shadow, `window #${i} missing inner-shadow div`).not.toBeNull();
        const diffs = {
          top: Math.abs(b.window.top - b.shadow!.top),
          right: Math.abs(b.window.right - b.shadow!.right),
          bottom: Math.abs(b.window.bottom - b.shadow!.bottom),
          left: Math.abs(b.window.left - b.shadow!.left),
        };
        for (const [edge, d] of Object.entries(diffs)) {
          expect(d, `window #${i} ${edge} edge off by ${d}px`).toBeLessThanOrEqual(BOX_TOL_PX);
        }
      }

      // 2. Pixel-diff a fixed full-viewport screenshot against the baseline.
      // Element screenshots vary in size when the cabin canvas extends
      // offscreen, so we capture the viewport itself (constant size).
      const buf = await page.screenshot({ fullPage: false });
      const outPath = path.join(outDir, `${sample.name}.png`);
      fs.writeFileSync(outPath, buf);

      const basePath = path.join(baselineDir, `${sample.name}.png`);
      if (!fs.existsSync(basePath)) {
        fs.copyFileSync(outPath, basePath);
        console.warn(`[baseline] created ${basePath}`);
        return;
      }
      const actual = PNG.sync.read(buf);
      const expected = PNG.sync.read(fs.readFileSync(basePath));
      expect(actual.width).toBe(expected.width);
      expect(actual.height).toBe(expected.height);
      const diff = new PNG({ width: actual.width, height: actual.height });
      const mismatched = pixelmatch(
        actual.data,
        expected.data,
        diff.data,
        actual.width,
        actual.height,
        { threshold: 0.1 },
      );
      const ratio = mismatched / (actual.width * actual.height);
      if (ratio > PIXEL_DIFF_TOL) {
        fs.writeFileSync(
          path.join(outDir, `${sample.name}.diff.png`),
          PNG.sync.write(diff),
        );
      }
      expect(
        ratio,
        `viewport @ ${sample.name} pixel diff ${(ratio * 100).toFixed(2)}%`,
      ).toBeLessThanOrEqual(PIXEL_DIFF_TOL);
    });
  }
});