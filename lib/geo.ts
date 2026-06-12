// Shared geo helpers. Used by the discover map and the onboarding "Top Cafes"
// screen to compute and display distances to cafes.

// Equirectangular approximation – plenty accurate at city scales and far
// cheaper than haversine.
export function approximateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const meanLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const x = dLng * Math.cos(meanLat);
  const y = dLat;
  return R * Math.sqrt(x * x + y * y);
}

// Format a metre distance as a short, human-friendly label (e.g. "850 m",
// "2.1 km").
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
