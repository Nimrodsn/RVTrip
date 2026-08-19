export interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  rain: number;
  weatherCode: number;
}

const WEATHER_ICONS: Record<number, string> = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

export function getWeatherIcon(code: number): string {
  return WEATHER_ICONS[code] || '🌡️';
}

/** A night below this is cold enough in an RV to be worth a warning. */
const COLD_NIGHT_C = 8;
/** Enough rain over a day to soak an awning and outdoor gear. */
const WET_DAY_MM = 5;
const STORM_CODES = [95, 96, 99];

export type NightWarning = 'coldNight' | 'heavyRain' | 'storm';

export function getNightWarnings(day: DayForecast): NightWarning[] {
  const warnings: NightWarning[] = [];
  if (day.tempMin <= COLD_NIGHT_C) warnings.push('coldNight');
  if (day.rain >= WET_DAY_MM) warnings.push('heavyRain');
  if (STORM_CODES.includes(day.weatherCode)) warnings.push('storm');
  return warnings;
}

interface DailySeries {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weathercode: number[];
  };
}

function toForecast(series: DailySeries): DayForecast[] {
  return series.daily.time.map((date, i) => ({
    date,
    tempMax: series.daily.temperature_2m_max[i],
    tempMin: series.daily.temperature_2m_min[i],
    rain: series.daily.precipitation_sum[i],
    weatherCode: series.daily.weathercode[i],
  }));
}

/**
 * One request for several places at once: Open-Meteo accepts comma separated coordinates and answers
 * with a series per point, in the order asked. That keeps the whole trip in a single cached response.
 */
export async function fetchForecastForPoints(
  points: { lat: number; lng: number }[],
  forecastDays = 8
): Promise<DayForecast[][]> {
  const latitudes = points.map((p) => p.lat).join(',');
  const longitudes = points.map((p) => p.lng).join(',');
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=${forecastDays}`
  );
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);

  // A single coordinate comes back as a bare object rather than a one-item array.
  const data = await res.json();
  const series: DailySeries[] = Array.isArray(data) ? data : [data];
  return series.map(toForecast);
}

export async function fetchForecast(lat: number, lng: number, forecastDays = 8): Promise<DayForecast[]> {
  const [forecast] = await fetchForecastForPoints([{ lat, lng }], forecastDays);
  return forecast;
}
