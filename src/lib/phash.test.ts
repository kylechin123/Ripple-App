import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { withinTarget, distanceMeters } from "./geo";
import { DUPLICATE_THRESHOLD, dHash, hamming } from "./phash";

/** A synthetic "photo": a gradient with some shapes, so the hash has structure. */
async function scene(seed: number, size = 800) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 0.75}">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="hsl(${seed * 47},70%,40%)"/><stop offset="1" stop-color="hsl(${seed * 91},60%,80%)"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${(seed * 137) % size}" cy="${(seed * 59) % (size * 0.75)}" r="${size / 6}" fill="#222"/>
    <rect x="${(seed * 71) % size}" y="40" width="${size / 4}" height="${size / 3}" fill="#eee"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

describe("duplicate photo detection", () => {
  it("matches the same photo after resizing and re-compression", async () => {
    const original = await scene(3);
    const reupload = await sharp(original).resize(400).jpeg({ quality: 50 }).toBuffer();
    expect(hamming(await dHash(original), await dHash(reupload))).toBeLessThanOrEqual(DUPLICATE_THRESHOLD);
  });

  it("does not match a different photo", async () => {
    const a = await dHash(await scene(3));
    const b = await dHash(await scene(8));
    expect(hamming(a, b)).toBeGreaterThan(DUPLICATE_THRESHOLD);
  });

  it("produces a 64-bit hex hash", async () => {
    expect(await dHash(await scene(1))).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("GPS check", () => {
  it("measures distance roughly right (Toogood Pond to Main St Markham ~5 km)", () => {
    const d = distanceMeters(43.8792, -79.3185, 43.8772, -79.2603);
    expect(d).toBeGreaterThan(4000);
    expect(d).toBeLessThan(6000);
  });

  it("allows radius + accuracy, with accuracy capped", () => {
    expect(withinTarget(250, 10)).toBe(true);
    expect(withinTarget(450, 200)).toBe(true);
    expect(withinTarget(900, 5000)).toBe(false); // vague fix can't pass from far away
  });
});
