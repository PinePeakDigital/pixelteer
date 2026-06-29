import { describe, it } from "vitest";
import { takeScreenshots } from "./takeScreenshots.js";

describe("takeScreenshots", () => {
  it("runs", async () => {
    await takeScreenshots({
      baseUrl1: "https://example.com",
      baseUrl2: "https://example.com",
      paths: ["/"],
      outDir: "out",
    });
  });
});
