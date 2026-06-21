import sharp, { type Sharp } from "sharp";

type Options = {
  buffer1: Buffer;
  buffer2: Buffer;
};

function resizeImage(image: Sharp, width: number, height: number) {
  return image.resize({
    width,
    height,
    fit: "contain",
    position: "left top",
  });
}

export default async function resizeImages({
  buffer1,
  buffer2,
}: Options): Promise<{
  out1: Buffer;
  out2: Buffer;
  width: number;
  height: number;
}> {
  const sharp1 = sharp(buffer1);
  const sharp2 = sharp(buffer2);
  const meta1 = await sharp1.metadata();
  const meta2 = await sharp2.metadata();

  if (!meta1.width || !meta1.height || !meta2.width || !meta2.height) {
    throw new Error("Missing image size data");
  }

  const width = Math.max(meta1.width, meta2.width);
  const height = Math.max(meta1.height, meta2.height);
  const shouldResize1 = meta1.width !== width || meta1.height !== height;
  const shouldResize2 = meta2.width !== width || meta2.height !== height;
  const out1 = shouldResize1 ? resizeImage(sharp1, width, height) : sharp1;
  const out2 = shouldResize2 ? resizeImage(sharp2, width, height) : sharp2;

  // pixelmatch requires 4-channel RGBA data (length === width * height * 4).
  // Opaque PNG screenshots decode to 3-channel RGB, which makes pixelmatch
  // throw "Image sizes do not match". ensureAlpha() adds an opaque alpha
  // channel when one is absent (no-op when already present), guaranteeing RGBA.
  return {
    out1: await out1.ensureAlpha().raw().toBuffer(),
    out2: await out2.ensureAlpha().raw().toBuffer(),
    width,
    height,
  };
}
