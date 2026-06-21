import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import resizeImages from "./resizeImages.js";

type Options = {
  buffer1: Buffer;
  buffer2: Buffer;
  diffThreshold?: number;
};

export type DiffResult = {
  diffCount: number;
  diffPng: Buffer;
  width: number;
  height: number;
};

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

  return { diffCount, diffPng: PNG.sync.write(diffImage), width, height };
}
