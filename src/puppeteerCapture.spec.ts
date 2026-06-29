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

  it("emits one isolated rule per selector, each hiding its descendants", () => {
    expect(maskCss([".counter", "#clock"])).toBe(
      ".counter, .counter * { visibility: hidden !important; }\n" +
        "#clock, #clock * { visibility: hidden !important; }"
    );
  });
});
