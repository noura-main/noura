/** Overpass QL builders — keep in sync with parse logic in NearbyFoodMap. */

const AMENITY_FILTER = `["amenity"~"restaurant|fast_food"]`;

/** Full query incl. relations (heavier; may 504 on busy instances). */
export function buildFullOverpassQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:50];
(
  node${AMENITY_FILTER}(around:${radiusM},${lat},${lng});
  way${AMENITY_FILTER}(around:${radiusM},${lat},${lng});
  relation${AMENITY_FILTER}(around:${radiusM},${lat},${lng});
);
out tags center;`;
}

/** Nodes + ways only; relations omitted to reduce server load and avoid 504s. */
export function buildLightOverpassQuery(lat: number, lng: number, radiusM: number): string {
  return `[out:json][timeout:50];
(
  node${AMENITY_FILTER}(around:${radiusM},${lat},${lng});
  way${AMENITY_FILTER}(around:${radiusM},${lat},${lng});
);
out tags center;`;
}
