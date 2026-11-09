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

// Extract a short suburb/city label from a full address string. Shared by the
// cafe list/map cards and the review detail screen so they read consistently.
export function extractLocation(address: string): string {
  if (!address) return '';
  const parts = address.split(',');
  if (parts.length > 1) {
    const suburb = parts[parts.length - 2]?.trim();
    if (suburb && !suburb.includes('Auckland')) {
      return suburb;
    }
  }
  return 'Auckland';
}

// Distance label from the user to a cafe, or undefined when either point is
// unknown (cards then show the suburb on its own). Shared by every cafe list so
// the same cafe shows the same distance on Home, Discover and Lists.
export function distanceLabelFor(
  from: { latitude: number; longitude: number } | null | undefined,
  cafe: { latitude?: number; longitude?: number }
): string | undefined {
  if (!from || typeof cafe.latitude !== 'number' || typeof cafe.longitude !== 'number') {
    return undefined;
  }
  return formatDistance(
    approximateDistanceMeters(from.latitude, from.longitude, cafe.latitude, cafe.longitude)
  );
}
