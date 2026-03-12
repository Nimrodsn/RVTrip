export interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipMm: number;
}

const WMO_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '🌧️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export function weatherIcon(code: number): string {
  return WMO_ICONS[code] ?? '🌡️';
}

export async function fetchForecast(lat: number, lng: number, days = 8): Promise<DayForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum&timezone=auto&forecast_days=${days}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const d = data.daily;
    if (!d?.time) return [];
    return d.time.map((date: string, i: number) => ({
      date,
      tempMax: d.temperature_2m_max[i],
      tempMin: d.temperature_2m_min[i],
      weatherCode: d.weathercode[i],
      precipMm: d.precipitation_sum[i],
    }));
  } catch {
    return [];
  }
}
