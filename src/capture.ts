// The capture seam: yield a full-page screenshot buffer for a URL. Callers
// (the comparison orchestrator) depend on this, not on Puppeteer. A `Session`
// owns whatever backing resource the capture needs (a browser, a remote
// service, a fixture) and is closed when the run finishes.
export type Capture = (url: string) => Promise<Buffer>;

export type CaptureSession = {
  capture: Capture;
  close: () => Promise<void>;
};

// A factory for capture sessions. The Puppeteer adapter is the default; tests
// pass a fake one to exercise orchestration without launching a browser.
export type CreateCaptureSession = () => Promise<CaptureSession>;
