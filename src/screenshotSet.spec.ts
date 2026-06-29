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
    const { path: p, kind: k } = decode(encode(path, kind));
    expect(p).toBe(path);
    expect(k).toBe(kind);
  });
});
