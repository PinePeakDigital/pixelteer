export type Kind = "1" | "2" | "diff";

// One module owns the screenshot-set filename contract: a URL path plus an
// image kind ("1", "2", "diff") encode to a single filename, and decode back.
//
// The round-trip is lossless. encodeURIComponent escapes the path separators
// (and anything else filesystem-unsafe); we additionally escape "." so the
// encoded path can never collide with the ".<kind>.png" suffix delimiter. That
// makes split(".") below unambiguous and fixes the old "/"<->"_" scheme, which
// mangled any path containing "_".

const encodePath = (path: string): string =>
  encodeURIComponent(path).replaceAll(".", "%2E");

export function encode(path: string, kind: Kind): string {
  return `${encodePath(path)}.${kind}.png`;
}

export function decode(filename: string): { path: string; kind: string } {
  const parts = filename.split(".");
  parts.pop(); // "png"
  const kind = parts.pop() ?? "";
  const path = decodeURIComponent(parts.join("."));
  return { path, kind };
}
