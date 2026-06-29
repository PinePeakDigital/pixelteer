import { describe, it, expect } from "vitest";
import { shouldAbort, maskCss } from "./puppeteerCapture.js";

describe("shouldAbort", () => {
  it("aborts images and scripts", () => {
    expect(shouldAbort("image")).toBe(true);
    expect(shouldAbort("script")).toBe(true);
  });

  it("allows everything else", () => {
    expect(shouldAbort("document")).toBe(false);
    expect(shouldAbort("stylesheet")).toBe(false);
    expect(shouldAbort("xhr")).toBe(false);
  });
});

describe("maskCss", () => {
  it("returns empty string for no selectors", () => {
    expect(maskCss()).toBe("");
    expect(maskCss([])).toBe("");
  });

  it("hides each selector and its descendants, joined into one rule", () => {
    expect(maskCss([".counter", "#clock"])).toBe(
      ".counter, .counter *, #clock, #clock * { visibility: hidden !important; }"
    );
  });
});
