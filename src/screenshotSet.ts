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

/** Encode a URL path + image kind into one filesystem-safe filename. */
export function encode(path: string, kind: Kind): string {
  return `${encodePath(path)}.${kind}.png`;
}

/**
 * Decode a filename produced by `encode` back to its path + kind, or return
 * `null` for anything outside the contract — `createReport` feeds every entry
 * in the shots directory through here, so stray files must be skipped rather
 * than throw (e.g. a malformed `%`-escape) or group under a bogus path.
 */
export function decode(filename: string): { path: string; kind: Kind } | null {
  const match = /^(.*)\.(1|2|diff)\.png$/.exec(filename);
  if (!match) return null;

  try {
    return { path: decodeURIComponent(match[1]), kind: match[2] as Kind };
  } catch {
    return null;
  }
}
