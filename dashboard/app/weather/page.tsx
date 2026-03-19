'use client';

import { useEffect, useState } from 'react';
import { itinerary } from '@/lib/itinerary';
import { strings } from '@/lib/strings';

interface DayForecast {
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

function getWeatherIcon(code: number): string {
  return WEATHER_ICONS[code] || '🌡️';
}

export default function WeatherPage() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);

  const loc = itinerary.locations[0];

  useEffect(() => {
    fetchWeather();
  }, []);

  async function fetchWeather() {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.lat}&longitude=${loc.coords.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&forecast_days=8`
      );
      const data = await res.json();
      const days: DayForecast[] = data.daily.time.map((date: string, i: number) => ({
        date,
        tempMax: data.daily.temperature_2m_max[i],
        tempMin: data.daily.temperature_2m_min[i],
        rain: data.daily.precipitation_sum[i],
        weatherCode: data.daily.weathercode[i],
      }));
      setForecast(days);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold text-primary mb-2">{strings.weather.title}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {strings.weather.forecast}: {loc.name} ({loc.coords.lat.toFixed(2)}, {loc.coords.lng.toFixed(2)})
      </p>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {forecast.map((day) => (
            <div
              key={day.date}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-center"
            >
              <div className="text-4xl mb-3">{getWeatherIcon(day.weatherCode)}</div>
              <div className="text-sm font-semibold text-primary mb-2">
                {new Date(day.date).toLocaleDateString('he-IL', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex justify-center gap-4 text-sm">
                <div>
                  <span className="text-red-500 font-bold">{day.tempMax}°</span>
                  <span className="text-gray-400 text-xs mr-1">{strings.weather.high}</span>
                </div>
                <div>
                  <span className="text-blue-500 font-bold">{day.tempMin}°</span>
                  <span className="text-gray-400 text-xs mr-1">{strings.weather.low}</span>
                </div>
              </div>
              {day.rain > 0 && (
                <div className="mt-2 text-xs text-blue-600">
                  💧 {day.rain} {strings.weather.mm}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
