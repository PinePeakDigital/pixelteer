// The capture seam: yield a full-page screenshot buffer for a URL. Callers
// (the comparison orchestrator) depend on this, not on Puppeteer. A `Session`
// owns whatever backing resource the capture needs (a browser, a remote
// service, a fixture) and is closed when the run finishes.
//
// `maskSelectors` names elements to blank before the shot (e.g. live counters,
// timestamps). Both sides of a comparison mask the same selectors, so those
// regions match and drop out of the diff instead of reading as a change.
export type Capture = (
  url: string,
  maskSelectors?: string[]
) => Promise<Buffer>;

export type CaptureSession = {
  capture: Capture;
  close: () => Promise<void>;
};

// A factory for capture sessions. The Puppeteer adapter is the default; tests
// pass a fake one to exercise orchestration without launching a browser.
export type CreateCaptureSession = () => Promise<CaptureSession>;
