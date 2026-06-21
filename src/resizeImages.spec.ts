import { describe, it, expect, vi } from "vitest";

// The global vitest.setup.ts mocks sharp/pixelmatch/resizeImages for the
// unit tests. This is an integration test that exercises the real modules.
vi.unmock("sharp");
vi.unmock("pixelmatch");
vi.unmock("./resizeImages");

import sharp from "sharp";
import pixelmatch from "pixelmatch";
import resizeImages from "./resizeImages.js";

// A solid-colour, fully opaque (3-channel RGB) PNG — the shape Puppeteer
// screenshots take, and the one that used to make pixelmatch throw.
function opaquePng(
  width: number,
  height: number,
  background: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background } })
    .png()
    .toBuffer();
}

describe("resizeImages (integration)", () => {
  it("returns 4-channel RGBA buffers for opaque RGB input", async () => {
    const red = await opaquePng(2, 2, { r: 255, g: 0, b: 0 });
    const blue = await opaquePng(2, 2, { r: 0, g: 0, b: 255 });

    const { out1, out2, width, height } = await resizeImages({
      buffer1: red,
      buffer2: blue,
    });

    // RGBA => 4 bytes per pixel. Without ensureAlpha these were 3 (RGB).
    expect(out1.length).toBe(width * height * 4);
    expect(out2.length).toBe(width * height * 4);
  });

  it("produces buffers pixelmatch diffs without throwing on differing images", async () => {
    const red = await opaquePng(3, 4, { r: 255, g: 0, b: 0 });
    const blue = await opaquePng(3, 4, { r: 0, g: 0, b: 255 });

    const { out1, out2, width, height } = await resizeImages({
      buffer1: red,
      buffer2: blue,
    });

    const diff = new Uint8Array(width * height * 4);
    // Previously threw "Image sizes do not match" because the buffers were RGB.
    const changed = pixelmatch(out1, out2, diff, width, height, {
      threshold: 0.1,
    });

    // Every pixel differs (solid red vs solid blue).
    expect(changed).toBe(width * height);
  });

  it("pads mismatched dimensions to the max and still yields RGBA", async () => {
    const small = await opaquePng(1, 1, { r: 255, g: 0, b: 0 });
    const large = await opaquePng(4, 5, { r: 0, g: 0, b: 255 });

    const { out1, out2, width, height } = await resizeImages({
      buffer1: small,
      buffer2: large,
    });

    expect(width).toBe(4);
    expect(height).toBe(5);
    expect(out1.length).toBe(width * height * 4);
    expect(out2.length).toBe(width * height * 4);
  });
});
