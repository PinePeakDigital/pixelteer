import fs from "fs";
import takeScreenshot from "./saveScreenshot.js";
import { diff } from "./diff.js";
import { Page } from "puppeteer";
import { makeOutPath } from "./makeOutPath.js";

type Options = {
  page: Page;
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

export async function handlePath({
  page,
  path,
  baseUrl1,
  baseUrl2,
  outDir,
  diffThreshold,
  saveThreshold = 10,
}: Options): Promise<PathResult> {
  const start = new Date().getTime();
  const buffer1 = await takeScreenshot({
    page,
    url: `${baseUrl1}${path}`,
  });

  const buffer2 = await takeScreenshot({
    page,
    url: `${baseUrl2}${path}`,
  });

  const { diffCount, diffPng } = await diff({
    buffer1,
    buffer2,
    diffThreshold,
  });

  if (diffCount > saveThreshold) {
    fs.writeFileSync(makeOutPath(path, "1", outDir), buffer1);
    fs.writeFileSync(makeOutPath(path, "2", outDir), buffer2);
    fs.writeFileSync(makeOutPath(path, "diff", outDir), diffPng);
  }

  return { path, diff: diffCount, ms: new Date().getTime() - start };
}
