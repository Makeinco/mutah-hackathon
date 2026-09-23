export type Wgs84Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Accept only finite WGS84 points that can be displayed meaningfully.
 * (0, 0) is the common missing-location sentinel and must never reach maps
 * or distance calculations as if it were a verified facility location.
 */
export function isUsableCoordinates(
  value: Wgs84Coordinates | null | undefined,
): value is Wgs84Coordinates {
  if (!value) return false;
  const { latitude, longitude } = value;
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}
