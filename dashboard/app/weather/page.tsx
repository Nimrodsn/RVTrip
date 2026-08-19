'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  days,
  getDateForDay,
  getIsoDateForDay,
  getNightStopForDay,
  type NightStopKind,
} from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import {
  fetchForecastForPoints,
  getNightWarnings,
  getWeatherIcon,
  type DayForecast,
  type NightWarning,
} from '@/lib/weather';
import type { Coords } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import StaggerList from '@/components/ui/StaggerList';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

/** How far ahead the free Open-Meteo forecast reaches. */
const MAX_FORECAST_DAYS = 16;

const WARNING_EMOJI: Record<NightWarning, string> = {
  coldNight: '❄️',
  heavyRain: '💧',
  storm: '⛈️',
};

interface TripNight {
  day: number;
  /** YYYY-MM-DD, matched against the forecast series. */
  date: string;
  dateLabel: string;
  place: string;
  kind: NightStopKind;
  coords: Coords;
}

function coordKey(coords: Coords): string {
  return `${coords.lat},${coords.lng}`;
}

function getTripNights(): TripNight[] {
  return days.flatMap((day) => {
    const stop = getNightStopForDay(day);
    if (!stop) return [];
    return [
      {
        day,
        date: getIsoDateForDay(day),
        dateLabel: getDateForDay(day),
        place: stop.location.name,
        kind: stop.kind,
        coords: stop.location.coords,
      },
    ];
  });
}

/** Enough days to reach the last night, since the series always starts today. */
function getForecastLength(lastDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastDate);
  last.setHours(0, 0, 0, 0);
  const span = Math.round((last.getTime() - today.getTime()) / 86_400_000) + 1;
  return Math.min(Math.max(span, 1), MAX_FORECAST_DAYS);
}

export default function WeatherPage() {
  const [byPlace, setByPlace] = useState<Record<string, DayForecast[]>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const nights = useMemo(getTripNights, []);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const keys = Array.from(new Set(nights.map((n) => coordKey(n.coords))));
      const points = keys.map((key) => {
        const [lat, lng] = key.split(',').map(Number);
        return { lat, lng };
      });
      const length = getForecastLength(nights[nights.length - 1].date);
      const forecasts = await fetchForecastForPoints(points, length);
      setByPlace(Object.fromEntries(keys.map((key, i) => [key, forecasts[i] ?? []])));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [nights]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader title={strings.weather.title} meta={strings.weather.perNight} />

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden>
            {nights.map((night) => (
              <Skeleton key={night.day} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : failed ? (
          <Card>
            <EmptyState
              emoji="📡"
              title={strings.common.loadFailed}
              description={strings.weather.offlineHint}
              action={<Button onClick={loadWeather}>{strings.common.retry}</Button>}
            />
          </Card>
        ) : (
          <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nights.map((night) => {
              const forecast = byPlace[coordKey(night.coords)]?.find((d) => d.date === night.date);
              const warnings = forecast ? getNightWarnings(forecast) : [];
              return (
                <Card key={night.day} interactive className="h-full p-5 flex flex-col">
                  <div className="flex items-baseline justify-between text-xs text-gray-400">
                    <span className="font-semibold text-primary">
                      {strings.weather.day} {night.day}
                    </span>
                    <span>{night.dateLabel}</span>
                  </div>

                  <div className="mt-3 text-4xl text-center" aria-hidden>
                    {forecast ? getWeatherIcon(forecast.weatherCode) : '🗓️'}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-primary leading-tight">
                    {night.kind === 'returnDay' ? '📍' : '🏕️'} {night.place}
                  </p>
                  {night.kind === 'secondNight' && (
                    <p className="mt-1 text-[11px] text-gray-400">{strings.weather.secondNight}</p>
                  )}
                  {night.kind === 'returnDay' && (
                    <p className="mt-1 text-[11px] text-gray-400">{strings.weather.returnDay}</p>
                  )}

                  {forecast ? (
                    <>
                      <div className="mt-3 flex gap-4 text-sm">
                        <div>
                          <span className="text-red-500 font-bold">
                            <AnimatedNumber value={forecast.tempMax} />°
                          </span>
                          <span className="text-gray-400 text-xs mr-1">{strings.weather.high}</span>
                        </div>
                        <div>
                          <span className="text-blue-500 font-bold">
                            <AnimatedNumber value={forecast.tempMin} />°
                          </span>
                          <span className="text-gray-400 text-xs mr-1">{strings.weather.low}</span>
                        </div>
                      </div>

                      {forecast.rain > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                          💧 {forecast.rain} {strings.weather.mm}
                        </div>
                      )}

                      {warnings.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2">
                          {warnings.map((warning) => (
                            <li key={warning} className="text-[11px] text-amber-700">
                              {WARNING_EMOJI[warning]} {strings.weather[warning]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 text-xs text-gray-400">{strings.weather.notYetAvailable}</p>
                  )}
                </Card>
              );
            })}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
