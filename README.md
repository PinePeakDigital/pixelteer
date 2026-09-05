# pixelteer

Visual-diff two deployments of the same site: capture full-page screenshots of
a set of paths across two base URLs, diff them pixel-by-pixel, and write the
originals + a rendered diff for any page that changed.

```ts
import { compareUrls, createReport } from "pixelteer";

await compareUrls({
  baseUrl1: "https://prod.example.com",
  baseUrl2: "http://localhost:3000",
  paths: ["/", "/about", "/blog"],
  outDir: "shots",
  diffThreshold: 0.2, // pixelmatch per-pixel sensitivity (0–1)
  saveThreshold: 10, // min differing pixels before a page is saved
  onSuccess: (r) => console.log(r.path, r.diff),
});

createReport({
  shotsDir: "shots",
  outDir: "shots",
  baseUrl1: "https://prod.example.com",
  baseUrl2: "http://localhost:3000",
});
```

## Pinning Chrome

`pixelteer` drives Chrome through `puppeteer`, which is a **peer dependency** —
you install it, and on install it downloads the exact Chrome build it pins (for
example, `puppeteer@25.10.0` pins **Chrome 152.0.7977.75**; each puppeteer
version pins its own Chrome build). That download is the deterministic
browser; as long as `puppeteer` resolves to a single version, local and CI get
the same Chrome.

Trouble shows up when the pinned build isn't actually present — e.g. you use
`puppeteer-core` (no bundled download), a lockfile drift leaves two puppeteer
versions, or the cache was pruned. To force a known-good browser everywhere:

```sh
# Install the exact build puppeteer pins (run in postinstall or a CI step)
npx puppeteer browsers install chrome
```

Override which browser `pixelteer` launches, in order of preference:

- **`PUPPETEER_EXECUTABLE_PATH`** env var — honoured by Puppeteer natively, no
  code change:

  ```sh
  PUPPETEER_EXECUTABLE_PATH=/path/to/chrome node run-diff.js
  ```

- **`launchOptions`** — forwarded verbatim to `puppeteer.launch`, so pass
  `executablePath` or `channel` to use a specific or system-installed Chrome:

  ```ts
  await compareUrls({
    /* … */
    launchOptions: { channel: "chrome" }, // use system stable Chrome
  });
  ```
