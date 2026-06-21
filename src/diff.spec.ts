import { describe, it, expect, vi } from "vitest";

// The global vitest.setup.ts mocks sharp/pixelmatch/pngjs/resizeImages for the
// unit tests. This exercises the real diff against in-memory buffers — no
// browser, no disk.
vi.unmock("sharp");
vi.unmock("pixelmatch");
vi.unmock("pngjs");
vi.unmock("./resizeImages");

import sharp from "sharp";
import { PNG } from "pngjs";
import { diff } from "./diff.js";

// A solid-colour, fully opaque (3-channel RGB) PNG — the shape Puppeteer
// screenshots take, and the one that used to make pixelmatch throw.
function opaquePng(
  width: number,
  height: number,
  background: { r: number; g: number; b: number }
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

describe("diff (integration)", () => {
  it("reports zero changed pixels for identical images", async () => {
    const red = await opaquePng(3, 4, { r: 255, g: 0, b: 0 });
    const sameRed = await opaquePng(3, 4, { r: 255, g: 0, b: 0 });

    const { diffCount, width, height } = await diff({
      buffer1: red,
      buffer2: sameRed,
    });

    expect(diffCount).toBe(0);
    expect(width).toBe(3);
    expect(height).toBe(4);
  });

  it("counts every pixel for fully different images", async () => {
    const red = await opaquePng(3, 4, { r: 255, g: 0, b: 0 });
    const blue = await opaquePng(3, 4, { r: 0, g: 0, b: 255 });

    const { diffCount, diffPng, width, height } = await diff({
      buffer1: red,
      buffer2: blue,
    });

    // Solid red vs solid blue — every pixel differs.
    expect(diffCount).toBe(width * height);

    // diffPng is the artifact handlePath writes to disk: it must be a real,
    // decodable PNG of the common dimensions that actually carries the diff —
    // a correctly-sized but blank image would be a silent regression.
    const decoded = PNG.sync.read(diffPng);
    expect(decoded.width).toBe(width);
    expect(decoded.height).toBe(height);
    expect(decoded.data.some((byte) => byte !== 0)).toBe(true);
  });

  it("pads mismatched dimensions to the max without throwing", async () => {
    const small = await opaquePng(1, 1, { r: 255, g: 0, b: 0 });
    const large = await opaquePng(4, 5, { r: 0, g: 0, b: 255 });

    // Previously the resize/alpha mismatch threw "Image sizes do not match".
    const { diffCount, diffPng, width, height } = await diff({
      buffer1: small,
      buffer2: large,
    });

    expect(width).toBe(4);
    expect(height).toBe(5);
    // The rendered diff image matches the common dimensions.
    const decoded = PNG.sync.read(diffPng);
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(5);
    expect(diffCount).toBeGreaterThan(0);
  });

  it("respects the diff threshold when deciding a pixel changed", async () => {
    const black = await opaquePng(2, 2, { r: 0, g: 0, b: 0 });
    const nearlyBlack = await opaquePng(2, 2, { r: 8, g: 8, b: 8 });

    // A high threshold tolerates the subtle difference: no pixels flagged.
    const tolerant = await diff({
      buffer1: black,
      buffer2: nearlyBlack,
      diffThreshold: 0.9,
    });
    expect(tolerant.diffCount).toBe(0);

    // A low threshold flags the same subtle difference on every pixel.
    const strict = await diff({
      buffer1: black,
      buffer2: nearlyBlack,
      diffThreshold: 0,
    });
    expect(strict.diffCount).toBe(strict.width * strict.height);
  });

  it("defaults the diff threshold to 0.2 when none is given", async () => {
    const red = await opaquePng(2, 2, { r: 255, g: 0, b: 0 });
    const blue = await opaquePng(2, 2, { r: 0, g: 0, b: 255 });

    // The default (0.2) must behave identically to passing it explicitly, so a
    // regression in the default constant can't slip through unnoticed.
    const implicit = await diff({ buffer1: red, buffer2: blue });
    const explicit = await diff({
      buffer1: red,
      buffer2: blue,
      diffThreshold: 0.2,
    });

    expect(implicit.diffCount).toBe(explicit.diffCount);
    expect(implicit.diffCount).toBe(implicit.width * implicit.height);
  });
});
