import Constants from 'expo-constants';

export interface DirectionsResult {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  warning?: string;
}

function getApiKey(): string {
  return (Constants.expoConfig?.extra?.googleMapsApiKey as string) || '';
}

export async function fetchDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult | null> {
  const key = getApiKey();
  if (!key) return null;

  const routesResult = await tryRoutesApi(originLat, originLng, destLat, destLng, key);
  if (routesResult) return routesResult;

  return haversineEstimate(originLat, originLng, destLat, destLng);
}

async function tryRoutesApi(
  oLat: number, oLng: number, dLat: number, dLng: number, key: string,
): Promise<DirectionsResult | null> {
  const url = `https://routes.googleapis.com/directions/v2:computeRoutes?key=${key}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: oLat, longitude: oLng } } },
        destination: { location: { latLng: { latitude: dLat, longitude: dLng } } },
        travelMode: 'DRIVE',
      }),
    });
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    const durationStr: string = route.duration || '0s';
    const durationSeconds = parseInt(durationStr.replace('s', ''), 10) || 0;
    return {
      polyline: route.polyline?.encodedPolyline ?? '',
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds,
      warning: 'המסלול לא נבדק לגובה ומשקל. יש לוודא גשרים ומגבלות משקל בדרך.',
    };
  } catch {
    return null;
  }
}

function haversineEstimate(
  oLat: number, oLng: number, dLat: number, dLng: number,
): DirectionsResult {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLa = toRad(dLat - oLat);
  const dLo = toRad(dLng - oLng);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(oLat)) * Math.cos(toRad(dLat)) * Math.sin(dLo / 2) ** 2;
  const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const roadDistance = straight * 1.35;
  const durationSeconds = Math.round(roadDistance / (70 / 3.6));
  return {
    polyline: '',
    distanceMeters: Math.round(roadDistance),
    durationSeconds,
    warning: 'זמן נסיעה משוער (קו אווירי × 1.35). לדיוק מלא, הפעל את Routes API בגוגל קלאוד.',
  };
}
