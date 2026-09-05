import puppeteer, { Page } from "puppeteer";
import fs from "fs";
import { CaptureSession } from "./capture.js";

const cssUrl = new URL("./inject.css", import.meta.url);
const css = fs.readFileSync(cssUrl, "utf8");

// Request-interception policy: abort images and scripts so captures are fast
// and deterministic. Exported so the policy is testable without a browser.
export function shouldAbort(resourceType: string): boolean {
  return resourceType === "image" || resourceType === "script";
}

// Build the stylesheet that blanks masked regions. `visibility: hidden` keeps
// each element's box (so layout below it doesn't shift) while removing its
// pixels, so the same selectors blank to the same area on both captures. Each
// selector also hides its descendants (`sel *`) so a child that re-asserts
// `visibility: visible` can't leak back into the diff when masking a wrapper.
// One rule per selector (not a single comma-joined list): a CSS selector list
// is unforgiving, so one malformed entry would otherwise drop the whole rule
// and disable every mask — separate rules keep a bad selector isolated.
// Returns "" for no selectors so we skip the style tag entirely.
// ponytail: hides pixels, not box size — if a masked element's own dimensions
// differ between the two sites, surrounding layout can still shift. Give it a
// fixed size in your own CSS if that bites.
export function maskCss(maskSelectors: string[] = []): string {
  return maskSelectors
    .map((s) => `${s}, ${s} * { visibility: hidden !important; }`)
    .join("\n");
}

// Capture one URL, retrying with exponential backoff. Lives behind the capture
// seam; the browser/page lifecycle is owned by createPuppeteerSession.
async function captureWithRetry(
  page: Page,
  url: string,
  maskSelectors?: string[]
): Promise<Buffer> {
  let attempt = 0;
  const maxAttempts = 10;
  let delay = 100; // Initial delay in milliseconds

  while (attempt < maxAttempts) {
    try {
      const loadingPromise = page.waitForNavigation({
        timeout: 0,
        waitUntil: "domcontentloaded",
      });

      await page.goto(url);
      await page.addStyleTag({ content: css });

      const mask = maskCss(maskSelectors);
      if (mask) await page.addStyleTag({ content: mask });

      // Use a dynamic delay based on the attempt count
      await new Promise((resolve) => setTimeout(resolve, delay));

      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Timeout"));
        }, 10000);
      });

      try {
        await Promise.race([loadingPromise, timeoutPromise]);
      } finally {
        // Clear the timer on the success path too; a live handle keeps Node's
        // event loop open and makes the CLI hang after the last capture.
        clearTimeout(timeoutId);
      }

      const screenshot = await page.screenshot({
        fullPage: true,
        optimizeForSpeed: true,
      });

      // Puppeteer 23+ returns Uint8Array instead of Buffer; the capture seam
      // promises Buffer (consumed by pixelmatch/pngjs), so wrap it.
      return Buffer.from(screenshot); // Successful capture, return the buffer
    } catch (error: unknown) {
      attempt++;
      if (attempt >= maxAttempts) {
        throw error; // Exceeded max attempts, rethrow the last error
      }

      // Exponential backoff: double the delay for the next attempt
      delay *= 2;

      console.warn(`Retry attempt ${attempt} after error:`);
      console.log(error);
    }
  }

  // Unreachable: the loop either returns a buffer or rethrows above.
  throw new Error("Unexpected error in captureWithRetry");
}

// Puppeteer's launch options, forwarded verbatim. Consumers pin or relocate
// Chrome with `executablePath` / `channel` here (or the PUPPETEER_EXECUTABLE_PATH
// env var, which Puppeteer honours natively). See README "Pinning Chrome".
export type LaunchOptions = Parameters<typeof puppeteer.launch>[0];

// The Puppeteer-backed capture session: one browser + page with image/script
// interception, exposing capture() over the seam and close() for teardown.
export async function createPuppeteerSession(
  launchOptions: LaunchOptions = {}
): Promise<CaptureSession> {
  const browser = await puppeteer.launch({
    headless: true,
    handleSIGINT: true,
    ...launchOptions,
  });
  try {
    const page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (shouldAbort(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    return {
      capture: (url, maskSelectors) =>
        captureWithRetry(page, url, maskSelectors),
      close: () => browser.close(),
    };
  } catch (error) {
    // Setup failed after launch; close the browser so the caller doesn't lose
    // the close handle and leak the Chromium process.
    await browser.close();
    throw error;
  }
}
