import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { strings } from '../src/constants/strings';
import { fetchForecast, weatherIcon } from '../src/services/weather';
import type { DayForecast } from '../src/services/weather';
import itineraryData from '../src/data/itinerary.json';
import type { Itinerary } from '../src/types/itinerary';

const itinerary = itineraryData as Itinerary;
const firstLoc = itinerary.locations[0];

export default function WeatherScreen() {
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast(firstLoc.coords.lat, firstLoc.coords.lng, 8)
      .then(setForecast)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{strings.weather.title}</Text>
      <Text style={styles.subtitle}>{strings.weather.forecast}</Text>
      <Text style={styles.location}>{firstLoc.name}</Text>

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      {forecast.map((day, i) => (
        <View key={day.date} style={styles.card}>
          <View style={styles.cardLeft}>
            <Text style={styles.icon}>{weatherIcon(day.weatherCode)}</Text>
          </View>
          <View style={styles.cardCenter}>
            <Text style={styles.date}>
              {i === 0 ? 'היום' : `יום ${i + 1}`} · {day.date}
            </Text>
            <View style={styles.temps}>
              <Text style={styles.tempHigh}>{Math.round(day.tempMax)}°</Text>
              <Text style={styles.tempDivider}>/</Text>
              <Text style={styles.tempLow}>{Math.round(day.tempMin)}°</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            {day.precipMm > 0 && (
              <Text style={styles.rain}>
                💧 {day.precipMm.toFixed(1)} {strings.weather.mm}
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right', marginBottom: 4, color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'right', marginBottom: 2 },
  location: { fontSize: 15, fontWeight: '600', color: '#555', textAlign: 'right', marginBottom: 20 },
  loader: { marginTop: 40 },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  cardLeft: { width: 44, alignItems: 'center' },
  icon: { fontSize: 30 },
  cardCenter: { flex: 1 },
  date: { fontSize: 13, color: '#888', textAlign: 'right', marginBottom: 4 },
  temps: { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 4 },
  tempHigh: { fontSize: 22, fontWeight: '700', color: '#c62828' },
  tempDivider: { fontSize: 16, color: '#bbb' },
  tempLow: { fontSize: 18, fontWeight: '600', color: '#1565c0' },
  cardRight: { width: 70, alignItems: 'flex-start' },
  rain: { fontSize: 12, color: '#1565c0', fontWeight: '600' },
});
