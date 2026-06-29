import fs from "fs";
import { handlePath, PathResult } from "./handlePath.js";
import { CreateCaptureSession } from "./capture.js";
import { createPuppeteerSession, LaunchOptions } from "./puppeteerCapture.js";

export type CompareUrlsOptions = {
  baseUrl1: string;
  baseUrl2: string;
  paths: string[];
  outDir: string;
  force?: boolean;
  diffThreshold?: number;
  saveThreshold?: number;
  onSuccess?: (data: PathResult & { total: number; current: number }) => void;
  onError?: (e: unknown) => void;
  // Forwarded to puppeteer.launch on the default backend — set `executablePath`
  // or `channel` here to pin Chrome. Ignored when `createSession` is overridden.
  launchOptions?: LaunchOptions;
  // The capture backend. Defaults to Puppeteer; tests/alternate backends inject
  // their own session over the capture seam.
  createSession?: CreateCaptureSession;
};

/**
 * Compare a set of paths across two base URLs. Guards the output directory
 * (created if missing; must be empty unless `force`), opens one capture session,
 * runs every path through it, and closes the session when done. The per-path
 * capture/diff/save lives in `handlePath`; the browser lives behind the capture
 * seam, so this orchestrator never touches Puppeteer directly.
 */
export async function compareUrls({
  baseUrl1,
  baseUrl2,
  paths,
  outDir,
  force,
  diffThreshold,
  saveThreshold,
  onSuccess = () => {},
  onError = (e: unknown) => {
    throw e;
  },
  launchOptions,
  createSession = () => createPuppeteerSession(launchOptions),
}: CompareUrlsOptions): Promise<void> {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const isEmpty = fs.readdirSync(outDir).length === 0;

  if (!isEmpty && !force) {
    throw new Error("Directory is not empty. Use `force` to overwrite.");
  }

  const { capture, close } = await createSession();

  try {
    const total = paths.length;

    for (const [i, path] of paths.entries()) {
      await handlePath({
        capture,
        path,
        baseUrl1,
        baseUrl2,
        outDir,
        diffThreshold,
        saveThreshold,
      })
        .then((result) => onSuccess({ ...result, total, current: i + 1 }))
        .catch(onError);
    }
  } finally {
    await close();
  }
}
