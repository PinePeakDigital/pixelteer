import fs from "fs";
import sharp from "sharp";
import { diff, padBox, BBox, DiffResult } from "./diff.js";
import { Capture } from "./capture.js";
import { encode, encodeCrop } from "./screenshotSet.js";

// Padding around the changed region in the cropped artifacts, so the localized
// change is shown with a little surrounding context.
const CROP_PADDING = 16;

type Options = {
  capture: Capture;
  path: string;
  baseUrl1: string;
  baseUrl2: string;
  outDir: string;
  diffThreshold?: number;
  saveThreshold?: number;
};

export type PathResult = {
  path: string;
  diff: number;
  // Fraction of the compared area that changed (diff pixels / total pixels).
  pct: number;
  ms: number;
  // Filenames (relative to outDir) of the cropped before/after/diff, present
  // only when the page cleared the save threshold and had a localizable region.
  crops?: { before: string; after: string; diff: string };
};

// Crop each image to the (padded) changed region and write the three localized
// PNGs. raw1/raw2 are the resized RGBA bytes from diff(); diffPng is already
// encoded. Returns the filenames it wrote.
async function saveCrops(
  outDir: string,
  path: string,
  box: BBox,
  { width, height, raw1, raw2, diffPng }: DiffResult
): Promise<{ before: string; after: string; diff: string }> {
  const region = padBox(box, CROP_PADDING, width, height);
  const rawInput = { raw: { width, height, channels: 4 as const } };
  const names = {
    before: encodeCrop(path, "1"),
    after: encodeCrop(path, "2"),
    diff: encodeCrop(path, "diff"),
  };

  await Promise.all([
    sharp(raw1, rawInput).extract(region).png().toFile(`${outDir}/${names.before}`),
    sharp(raw2, rawInput).extract(region).png().toFile(`${outDir}/${names.after}`),
    sharp(diffPng).extract(region).png().toFile(`${outDir}/${names.diff}`),
  ]);

  return names;
}

/**
 * Compare a single path across two base URLs: capture both pages, diff them,
 * and — only when the pixel difference clears `saveThreshold` — persist the
 * originals, the rendered diff, and a cropped before/after/diff of the changed
 * region. Returns the path, its diff count, the changed fraction, how long the
 * comparison took, and any crop filenames. The pixel comparison and region
 * localization live in `diff`; this orchestrates capture and the save decision.
 */
export async function handlePath({
  capture,
  path,
  baseUrl1,
  baseUrl2,
  outDir,
  diffThreshold,
  saveThreshold = 10,
}: Options): Promise<PathResult> {
  const start = new Date().getTime();
  const buffer1 = await capture(`${baseUrl1}${path}`);
  const buffer2 = await capture(`${baseUrl2}${path}`);

  const result = await diff({ buffer1, buffer2, diffThreshold });
  const { diffCount, diffPng, width, height, bbox } = result;

  const pct = width * height > 0 ? diffCount / (width * height) : 0;
  let crops: PathResult["crops"];

  if (diffCount > saveThreshold) {
    fs.writeFileSync(`${outDir}/${encode(path, "1")}`, buffer1);
    fs.writeFileSync(`${outDir}/${encode(path, "2")}`, buffer2);
    fs.writeFileSync(`${outDir}/${encode(path, "diff")}`, diffPng);

    if (bbox) {
      crops = await saveCrops(outDir, path, bbox, result);
    }
  }

  return { path, diff: diffCount, pct, ms: new Date().getTime() - start, crops };
}
