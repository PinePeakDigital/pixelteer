import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import resizeImages from "./resizeImages.js";

type Options = {
  buffer1: Buffer;
  buffer2: Buffer;
  diffThreshold?: number;
};

export type BBox = { left: number; top: number; width: number; height: number };

export type DiffResult = {
  diffCount: number;
  diffPng: Buffer;
  width: number;
  height: number;
  // Bounding box of the changed region (null when nothing changed), and the
  // resized RGBA bytes of each input — handlePath crops these to the box to
  // localize the diff.
  bbox: BBox | null;
  raw1: Buffer;
  raw2: Buffer;
};

/**
 * Bounding box of the changed pixels in a pixelmatch diff image. pixelmatch
 * paints counted differences in its default `diffColor` (solid red, [255,0,0])
 * over a faded-grayscale background, so a pure-red test isolates exactly the
 * pixels it flagged. Returns null when nothing changed — or when `data` is
 * shorter than the image (e.g. a stubbed PNG under test) — so callers skip
 * cropping rather than crash.
 */
export function boundingBox(
  data: Uint8Array,
  width: number,
  height: number
): BBox | null {
  if (!data || data.length < width * height * 4) return null;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] === 255 && data[i + 1] === 0 && data[i + 2] === 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Grow a box by `pad` px on every side, clamped to the image bounds. */
export function padBox(
  box: BBox,
  pad: number,
  maxWidth: number,
  maxHeight: number
): BBox {
  const left = Math.max(0, box.left - pad);
  const top = Math.max(0, box.top - pad);
  const right = Math.min(maxWidth, box.left + box.width + pad);
  const bottom = Math.min(maxHeight, box.top + box.height + pad);
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * The core comparison: resize two captures to a common size, run pixelmatch,
 * and report how many pixels differ. Pure with respect to the filesystem and
 * Puppeteer — it takes two image buffers plus the diff threshold and returns
 * the pixel-difference count alongside the rendered diff image as encoded PNG
 * bytes ready to write to disk.
 *
 * Resize, alpha-handling, pixel matching, and PNG encoding all live here so the
 * "Image sizes do not match" class of bug has a single seam.
 */
export async function diff({
  buffer1,
  buffer2,
  diffThreshold = 0.2,
}: Options): Promise<DiffResult> {
  const { out1, out2, width, height } = await resizeImages({
    buffer1,
    buffer2,
  });

  const diffImage = new PNG({ width, height });

  const diffCount = pixelmatch(out1, out2, diffImage.data, width, height, {
    threshold: diffThreshold,
  });

  return {
    diffCount,
    diffPng: PNG.sync.write(diffImage),
    width,
    height,
    bbox: boundingBox(diffImage.data, width, height),
    raw1: out1,
    raw2: out2,
  };
}
