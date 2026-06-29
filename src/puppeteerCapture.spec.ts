import { describe, it, expect } from "vitest";
import { shouldAbort } from "./puppeteerCapture.js";

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
