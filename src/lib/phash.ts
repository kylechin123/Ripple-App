import "server-only";
import sharp from "sharp";

/**
 * 64-bit difference hash (dHash). Robust to resizing/re-compression, so a photo
 * that's been re-uploaded or lightly edited still matches.
 */
export async function dHash(image: Buffer): Promise<string> {
  const { data } = await sharp(image).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  let bits = "";
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) bits += data[y * 9 + x] < data[y * 9 + x + 1] ? "1" : "0";
  let hex = "";
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

export function hamming(a: string, b: string) {
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

export const DUPLICATE_THRESHOLD = 8;

/** Downscale for the vision model (Claude's sweet spot is <= 1568px on the long edge). */
export async function toVisionJpeg(image: Buffer) {
  return sharp(image).rotate().resize(1568, 1568, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}
