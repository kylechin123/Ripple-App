"use client";

export type Position = { lat: number; lng: number; accuracy: number };

/** Current position, or null if denied / unavailable. Requires HTTPS (or localhost). */
export function getPosition(timeoutMs = 10000): Promise<Position | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}

/**
 * Shrink a phone photo to <= maxEdge px JPEG before upload. Keeps uploads small
 * (well under Vercel's body limit and Claude's image limit).
 */
export async function resizeImage(file: File, maxEdge = 1568, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process photo"))), "image/jpeg", quality));
}

const DEMO_LOC_KEY = "ripple.demoLocation";
export function getDemoLocation() {
  try {
    return localStorage.getItem(DEMO_LOC_KEY) === "1";
  } catch {
    return false;
  }
}
export function setDemoLocation(on: boolean) {
  try {
    localStorage.setItem(DEMO_LOC_KEY, on ? "1" : "0");
  } catch {}
}

/** Tiny Markdown renderer for quest briefs (bold, bullets, paragraphs). Escapes HTML first. */
export function renderBrief(md: string) {
  const esc = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  const blocks = esc.split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      const h = b.match(/^(#{1,3})\s+(.*)$/);
      if (h) return `<h3>${inline(h[2])}</h3>`;
      return `<p>${inline(lines.join("<br/>"))}</p>`;
    })
    .join("");
}
