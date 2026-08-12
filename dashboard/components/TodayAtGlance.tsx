'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { days, getCurrentTripDay, getDateForDay, getDayOffsetFromToday, itinerary } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import { fetchForecast, getWeatherIcon, type DayForecast } from '@/lib/weather';
import { TYPE_COLORS, TYPE_EMOJI } from '@/lib/types';
import { Skeleton } from '@/components/Skeleton';
import Card from '@/components/ui/Card';

export default function TodayAtGlance() {
  const [tripDay, setTripDay] = useState<number | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [weather, setWeather] = useState<DayForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Resolved after mount so the server and client markup agree on the date.
  useEffect(() => {
    setTripDay(getCurrentTripDay());
    setDayOffset(getDayOffsetFromToday());
  }, []);

  const activeDay = tripDay ?? days[0];
  const dayStops = itinerary.locations.filter((loc) => loc.day === activeDay);
  const nextStop = dayStops[0];

  useEffect(() => {
    if (!nextStop) return;
    let active = true;

    fetchForecast(nextStop.coords.lat, nextStop.coords.lng, 1)
      .then((forecast) => {
        if (active) setWeather(forecast[0] ?? null);
      })
      .catch(() => {
        if (active) setWeather(null);
      })
      .finally(() => {
        if (active) setWeatherLoading(false);
      });

    return () => {
      active = false;
    };
  }, [nextStop]);

  const status = tripDay
    ? `${strings.home.dayOf} ${tripDay} ${strings.home.outOf} ${days.length}`
    : dayOffset < 0
      ? `${Math.abs(dayOffset)} ${strings.home.daysToGo}`
      : strings.home.tripEnded;

  return (
    <Card interactive className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-primary">{strings.home.atGlance}</h2>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">{status}</span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <GlanceCell label={strings.home.dayOf}>
          <p className="text-lg font-extrabold text-primary">
            {strings.home.dayOf} {activeDay}
          </p>
          <p className="text-xs text-gray-500">{getDateForDay(activeDay)}</p>
        </GlanceCell>

        <GlanceCell label={strings.home.nextStop}>
          {nextStop ? (
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base"
                style={{ backgroundColor: TYPE_COLORS[nextStop.type].bg }}
                aria-hidden
              >
                {TYPE_EMOJI[nextStop.type]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-primary">{nextStop.name}</p>
                <p className="text-xs text-gray-500">
                  {dayStops.length} {strings.home.stopsToday}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">{strings.today.noStops}</p>
          )}
        </GlanceCell>

        <GlanceCell label={strings.home.weather}>
          {weatherLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : weather ? (
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {getWeatherIcon(weather.weatherCode)}
              </span>
              <p className="text-sm font-bold text-primary">
                <span className="text-red-500">{Math.round(weather.tempMax)}°</span>
                {' / '}
                <span className="text-blue-500">{Math.round(weather.tempMin)}°</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </GlanceCell>
      </div>

      <Link
        href="/today"
        className="mt-4 inline-block text-sm font-bold text-blue-600 hover:underline"
      >
        {strings.home.viewDayPlan} ←
      </Link>
    </Card>
  );
}

function GlanceCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-gray-400">{label}</p>
      {children}
    </div>
  );
}
