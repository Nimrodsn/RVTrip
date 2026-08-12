'use client';

import { useCallback, useEffect, useState } from 'react';
import { itinerary } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import { fetchForecast, getWeatherIcon, type DayForecast } from '@/lib/weather';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import StaggerList from '@/components/ui/StaggerList';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AnimatedNumber from '@/components/ui/AnimatedNumber';

export default function WeatherPage() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loc = itinerary.locations[0];

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setForecast(await fetchForecast(loc.coords.lat, loc.coords.lng));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loc.coords.lat, loc.coords.lng]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <PageHeader
        title={strings.weather.title}
        meta={`${strings.weather.forecast}: ${loc.name} (${loc.coords.lat.toFixed(2)}, ${loc.coords.lng.toFixed(2)})`}
      />

      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
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
          <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {forecast.map((day) => (
              <Card key={day.date} interactive className="h-full p-5 text-center">
                <div className="text-4xl mb-3" aria-hidden>{getWeatherIcon(day.weatherCode)}</div>
                <div className="text-sm font-semibold text-primary mb-2">
                  {new Date(day.date).toLocaleDateString('he-IL', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex justify-center gap-4 text-sm">
                  <div>
                    <span className="text-red-500 font-bold">
                      <AnimatedNumber value={day.tempMax} />°
                    </span>
                    <span className="text-gray-400 text-xs mr-1">{strings.weather.high}</span>
                  </div>
                  <div>
                    <span className="text-blue-500 font-bold">
                      <AnimatedNumber value={day.tempMin} />°
                    </span>
                    <span className="text-gray-400 text-xs mr-1">{strings.weather.low}</span>
                  </div>
                </div>
                {day.rain > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    💧 {day.rain} {strings.weather.mm}
                  </div>
                )}
              </Card>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
