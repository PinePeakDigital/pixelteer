import { vi } from "vitest";

vi.mock("./src/createReport");

vi.mock("./src/resizeImages", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      out1: Buffer.from(""),
      out2: Buffer.from(""),
      width: 100,
      height: 100,
    })
  ),
}));

vi.mock("pixelmatch");
vi.mock("fs");
vi.mock("pngjs");
vi.mock("sharp");

// No global puppeteer mock: the capture seam (compareUrls' `createSession`) is
// injected with a fake session in tests, so nothing here launches a browser.
