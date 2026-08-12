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

export async function fetchForecast(lat: number, lng: number, forecastDays = 8): Promise<DayForecast[]> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=${forecastDays}`
  );
  if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);

  const data = await res.json();
  return data.daily.time.map((date: string, i: number) => ({
    date,
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    rain: data.daily.precipitation_sum[i],
    weatherCode: data.daily.weathercode[i],
  }));
}
