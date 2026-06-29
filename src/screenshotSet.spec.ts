import { describe, it, expect } from "vitest";
import { encode, decode, Kind } from "./screenshotSet.js";

describe("screenshotSet", () => {
  it("encodes path + kind into a filename", () => {
    expect(encode("/about", "diff")).toBe("%2Fabout.diff.png");
  });

  it.each<[string, Kind]>([
    ["/", "1"],
    ["/about", "2"],
    ["/blog/some_post", "diff"], // underscore: old scheme decoded this wrong
    ["/blog/2013.html", "1"], // dot: must not collide with the suffix delimiter
    ["/a/b/c", "2"],
  ])("round-trips %s (%s)", (path, kind) => {
    const set = decode(encode(path, kind));
    expect(set?.path).toBe(path);
    expect(set?.kind).toBe(kind);
  });

  it.each([
    "report.html", // not a screenshot
    "%2Fabout.99.png", // unknown kind
    "%2Fabout.diff.jpg", // wrong extension
    "%ZZ.diff.png", // malformed escape -> decodeURIComponent throws
  ])("returns null for non-contract filename %s", (filename) => {
    expect(decode(filename)).toBeNull();
  });
});
