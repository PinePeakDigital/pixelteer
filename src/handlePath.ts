import fs from "fs";
import { diff } from "./diff.js";
import { Capture } from "./capture.js";
import { encode } from "./screenshotSet.js";

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
  ms: number;
};

/**
 * Compare a single path across two base URLs: capture both pages, diff them,
 * and persist the originals plus the rendered diff only when the pixel
 * difference clears `saveThreshold`. Returns the path, its diff count, and how
 * long the comparison took. The pixel comparison itself lives in `diff`; this
 * orchestrates capture and the save-if-over-threshold decision.
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

  const { diffCount, diffPng } = await diff({
    buffer1,
    buffer2,
    diffThreshold,
  });

  if (diffCount > saveThreshold) {
    fs.writeFileSync(`${outDir}/${encode(path, "1")}`, buffer1);
    fs.writeFileSync(`${outDir}/${encode(path, "2")}`, buffer2);
    fs.writeFileSync(`${outDir}/${encode(path, "diff")}`, diffPng);
  }

  return { path, diff: diffCount, ms: new Date().getTime() - start };
}
