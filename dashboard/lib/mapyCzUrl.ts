export function buildMapyCzUrl(
  lat: number,
  lng: number,
  locationType?: string,
): string {
  const params = new URLSearchParams({
    start: 'auto',
    end: `${lng},${lat}`,
    routeType: 'foot_hiking',
    mapset: 'outdoor',
    base: 'outdoor-hiking',
  });
  if (locationType === 'attraction') {
    params.set('center', `${lng},${lat}`);
    params.set('zoom', '16');
  }
  return `https://mapy.cz/fnc/v1/route?${params.toString()}`;
}

/**
 * Builds the same URL as buildMapyCzUrl but as a raw string for use
 * inside iframe template literals (where we can't import modules).
 */
export function buildMapyCzUrlInline(
  latExpr: string,
  lngExpr: string,
  isAttraction: boolean,
): string {
  const base = `https://mapy.cz/fnc/v1/route?start=auto&end=${lngExpr}%2C${latExpr}&routeType=foot_hiking&mapset=outdoor&base=outdoor-hiking`;
  if (isAttraction) {
    return `${base}&center=${lngExpr}%2C${latExpr}&zoom=16`;
  }
  return base;
}
