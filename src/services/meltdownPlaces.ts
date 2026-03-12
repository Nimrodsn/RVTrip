import Constants from 'expo-constants';

const RADIUS_M = 15000; // 15 km

export type MeltdownCategory = 'playground' | 'ice_cream' | 'lake';

export interface MeltdownPlace {
  placeId: string;
  name: string;
  vicinity: string;
  lat: number;
  lng: number;
  category: MeltdownCategory;
  distanceKm?: number;
}

const CATEGORY_QUERIES: Record<MeltdownCategory, string> = {
  playground: 'playground park parking',
  ice_cream: 'ice cream gelato parking',
  lake: 'lake beach parking',
};

function getApiKey(): string {
  return (Constants.expoConfig?.extra?.googleMapsApiKey as string) || '';
}

function buildSearchUrl(lat: number, lng: number, query: string): string {
  const key = getApiKey();
  const location = `${lat},${lng}`;
  const encoded = encodeURIComponent(query);
  return `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encoded}&location=${location}&radius=${RADIUS_M}&key=${key}`;
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function fetchMeltdownPlaces(
  userLat: number,
  userLng: number
): Promise<{ playground?: MeltdownPlace; ice_cream?: MeltdownPlace; lake?: MeltdownPlace }> {
  const key = getApiKey();
  if (!key) {
    return {};
  }

  const result: {
    playground?: MeltdownPlace;
    ice_cream?: MeltdownPlace;
    lake?: MeltdownPlace;
  } = {};

  const categories: MeltdownCategory[] = ['playground', 'ice_cream', 'lake'];

  await Promise.all(
    categories.map(async (category) => {
      const query = CATEGORY_QUERIES[category];
      const url = buildSearchUrl(userLat, userLng, query);
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return;
        const candidates = data.results || [];
        const first = candidates[0];
        if (first) {
          const place: MeltdownPlace = {
            placeId: first.place_id,
            name: first.name || 'Unknown',
            vicinity: first.vicinity || '',
            lat: first.geometry?.location?.lat ?? 0,
            lng: first.geometry?.location?.lng ?? 0,
            category,
            distanceKm: distanceKm(
              userLat,
              userLng,
              first.geometry?.location?.lat ?? 0,
              first.geometry?.location?.lng ?? 0
            ),
          };
          result[category] = place;
        }
      } catch {
        // ignore
      }
    })
  );

  return result;
}
