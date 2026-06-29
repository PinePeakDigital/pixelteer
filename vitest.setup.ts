import { vi } from "vitest";

vi.mock("./src/createReport");
vi.mock("./src/saveScreenshot");

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

vi.mock("puppeteer", () => ({
  default: {
    launch: vi.fn(async () => ({
      newPage: vi.fn(async () => ({
        setViewport: vi.fn(),
        goto: vi.fn(),
        screenshot: vi.fn(),
        close: vi.fn(),
        setRequestInterception: vi.fn(),
        on: vi.fn(),
      })),
      close: vi.fn(),
    })),
  },
}));
