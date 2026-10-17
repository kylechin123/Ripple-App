/** Great-circle distance in metres. */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const GPS_RADIUS_M = 300;
export const GPS_ACCURACY_CAP_M = 500;

/** Allowed distance = radius + reported accuracy, with accuracy capped so a vague fix can't pass from anywhere. */
export function withinTarget(distance: number, accuracy: number | null | undefined) {
  const acc = Math.min(Math.max(0, accuracy ?? 0), GPS_ACCURACY_CAP_M);
  return distance <= GPS_RADIUS_M + acc;
}
