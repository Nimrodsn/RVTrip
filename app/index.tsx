import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useRVProfile } from '../src/contexts/RVProfileContext';
import { EmergencyMeltdown } from '../src/components/EmergencyMeltdown';
import { strings } from '../src/constants/strings';
import { loadChecklist } from '../src/services/storage';
import itineraryData from '../src/data/itinerary.json';
import type { Itinerary, ItineraryLocation, LocationType } from '../src/types/itinerary';

const itinerary = itineraryData as Itinerary;

const CHECKLIST_TOTAL = 8;

const TYPE_COLORS: Record<LocationType, { bg: string; dot: string; text: string }> = {
  campsite: { bg: '#e8f5e9', dot: '#2e7d32', text: '#1b5e20' },
  attraction: { bg: '#ffebee', dot: '#c62828', text: '#b71c1c' },
  supply: { bg: '#e3f2fd', dot: '#1565c0', text: '#0d47a1' },
};

const TYPE_EMOJI: Record<LocationType, string> = {
  campsite: '⛺', attraction: '🎯', supply: '🛒',
};

const days = Array.from(new Set(itinerary.locations.map((l) => l.day))).sort((a, b) => a - b);

function buildPreviewLeafletHtml(): string {
  const markers = itinerary.locations.map((loc) => {
    const color = TYPE_COLORS[loc.type].dot;
    return `L.circleMarker([${loc.coords.lat}, ${loc.coords.lng}], {
      radius: 7, fillColor: '${color}', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
    }).addTo(map);`;
  }).join('\n');
  const polyCoords = itinerary.locations.map((l) => `[${l.coords.lat}, ${l.coords.lng}]`).join(',');
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}
.leaflet-control-zoom,.leaflet-control-attribution{display:none!important}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
${markers}
var c=[${polyCoords}];
if(c.length>1){L.polyline(c,{color:'#1a1a1a',weight:2,opacity:0.4,dashArray:'6,5'}).addTo(map);}
if(c.length>0){map.fitBounds(c,{padding:[20,20]});}
<\/script></body></html>`;
}

const previewHtml = buildPreviewLeafletHtml();
const previewDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(previewHtml)}`;

function TripMapPreview() {
  const router = useRouter();
  if (Platform.OS !== 'web') {
    const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined;
    const MapView = require('react-native-maps').default;
    const { Marker, PROVIDER_GOOGLE } = require('react-native-maps');
    return (
      <Pressable style={s.mapContainer} onPress={() => router.push('/map')}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          provider={apiKey ? PROVIDER_GOOGLE : undefined}
          initialRegion={{ latitude: 49.5, longitude: 18, latitudeDelta: 4.5, longitudeDelta: 8 }}
          scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
          pointerEvents="none"
        >
          {itinerary.locations.map((loc, i) => (
            <Marker key={`${loc.day}-${i}`} coordinate={{ latitude: loc.coords.lat, longitude: loc.coords.lng }} pinColor={TYPE_COLORS[loc.type].dot} />
          ))}
        </MapView>
        <View style={s.mapOverlay}><Text style={s.mapOverlayText}>{strings.home.viewFullMap}</Text></View>
      </Pressable>
    );
  }
  return (
    <Pressable style={s.mapContainer} onPress={() => router.push('/map')}>
      {/* @ts-ignore */}
      <iframe src={previewDataUrl} width="100%" height="100%" frameBorder="0" />
      <View style={s.mapOverlay}><Text style={s.mapOverlayText}>{strings.home.viewFullMap}</Text></View>
    </Pressable>
  );
}

function ChecklistBanner() {
  const router = useRouter();
  const [done, setDone] = useState<number | null>(null);
  useEffect(() => {
    loadChecklist().then((state) => {
      setDone(Object.values(state).filter(Boolean).length);
    });
  }, []);
  if (done === null) return null;
  const allDone = done >= CHECKLIST_TOTAL;
  return (
    <Pressable
      style={allDone ? s.bannerOk : s.bannerWarn}
      onPress={() => router.push('/checklist')}
    >
      <Text style={s.bannerText}>
        {allDone ? `✅ ${strings.home.checklistOk}` : `⚠️ ${strings.home.checklistWarning} (${done}/${CHECKLIST_TOTAL})`}
      </Text>
    </Pressable>
  );
}

function DayTimeline() {
  const grouped: Record<number, ItineraryLocation[]> = {};
  for (const loc of itinerary.locations) {
    if (!grouped[loc.day]) grouped[loc.day] = [];
    grouped[loc.day].push(loc);
  }
  return (
    <View style={s.timeline}>
      {days.map((day) => (
        <View key={day} style={s.dayRow}>
          <View style={s.dayBadge}><Text style={s.dayBadgeText}>{day}</Text></View>
          <View style={s.dayStops}>
            {grouped[day].map((loc, i) => (
              <View key={i} style={[s.stopChip, { backgroundColor: TYPE_COLORS[loc.type].bg }]}>
                <Text style={s.stopEmoji}>{TYPE_EMOJI[loc.type]}</Text>
                <Text style={[s.stopName, { color: TYPE_COLORS[loc.type].text }]} numberOfLines={1}>{loc.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { height, width, weight } = useRVProfile();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{strings.home.title}</Text>
        <Text style={s.subtitle}>{itinerary.trip_name}</Text>
        <Text style={s.specs}>{strings.home.rvSpecs}: {height}m × {width}m, {weight}t</Text>
      </View>

      <ChecklistBanner />
      <TripMapPreview />

      <View style={s.grid}>
        <Pressable style={s.gridCard} onPress={() => router.push('/today')}>
          <Text style={s.gridEmoji}>📋</Text>
          <Text style={s.gridLabel}>{strings.home.todayPlan}</Text>
        </Pressable>
        <Pressable style={s.gridCard} onPress={() => router.push('/weather')}>
          <Text style={s.gridEmoji}>🌤️</Text>
          <Text style={s.gridLabel}>{strings.home.weather}</Text>
        </Pressable>
        <Pressable style={s.gridCard} onPress={() => router.push('/budget')}>
          <Text style={s.gridEmoji}>💰</Text>
          <Text style={s.gridLabel}>{strings.home.budget}</Text>
        </Pressable>
        <Pressable style={s.gridCard} onPress={() => router.push('/journal')}>
          <Text style={s.gridEmoji}>📸</Text>
          <Text style={s.gridLabel}>{strings.home.journal}</Text>
        </Pressable>
        <Pressable style={s.gridCard} onPress={() => router.push('/documents')}>
          <Text style={s.gridEmoji}>📎</Text>
          <Text style={s.gridLabel}>{strings.home.documents}</Text>
        </Pressable>
      </View>

      <View style={s.actions}>
        <Pressable style={s.button} onPress={() => router.push('/map')}>
          <Text style={s.buttonText}>{strings.home.map}</Text>
        </Pressable>

        <EmergencyMeltdown />

        <Pressable style={s.buttonSecondary} onPress={() => router.push('/checklist')}>
          <Text style={s.buttonSecondaryText}>{strings.home.preFlight}</Text>
        </Pressable>

        <Pressable style={s.buttonSecondary} onPress={() => router.push('/commander')}>
          <Text style={s.buttonSecondaryText}>{strings.home.commander}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 48 },
  header: { paddingHorizontal: 24, paddingTop: 24, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, textAlign: 'right', color: '#1a1a1a' },
  subtitle: { fontSize: 17, marginBottom: 6, textAlign: 'right', color: '#444' },
  specs: { fontSize: 14, textAlign: 'right', color: '#777' },

  bannerWarn: {
    marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 12,
    alignItems: 'center', backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffe0b2',
  },
  bannerOk: {
    marginHorizontal: 16, borderRadius: 12, padding: 14, marginBottom: 12,
    alignItems: 'center', backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9',
  },
  bannerText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  mapContainer: { height: 200, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#263238', marginBottom: 16 },
  mapOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 7, alignItems: 'center' },
  mapOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontWeight: '700', textAlign: 'right', paddingHorizontal: 24, marginBottom: 10, color: '#1a1a1a' },

  timeline: { paddingHorizontal: 16, marginBottom: 20 },
  dayRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', marginBottom: 8 },
  dayBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  dayBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dayStops: { flex: 1, flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 5 },
  stopChip: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 8, gap: 3 },
  stopEmoji: { fontSize: 12 },
  stopName: { fontSize: 12, fontWeight: '600', maxWidth: 160 },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  gridCard: {
    width: '47%' as any, backgroundColor: '#f8f9fa', borderRadius: 14, padding: 18,
    alignItems: 'center' as const, borderWidth: 1, borderColor: '#eee',
  },
  gridEmoji: { fontSize: 28, marginBottom: 8 },
  gridLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },

  actions: { paddingHorizontal: 24, alignItems: 'stretch' as const },
  button: {
    backgroundColor: '#1a1a1a', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 12, minHeight: 50, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 10,
  },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  buttonSecondary: {
    backgroundColor: '#f5f5f5', paddingVertical: 16, paddingHorizontal: 32,
    borderRadius: 12, minHeight: 50, alignItems: 'center' as const, justifyContent: 'center' as const,
    marginBottom: 10, borderWidth: 2, borderColor: '#e0e0e0',
  },
  buttonSecondaryText: { color: '#1a1a1a', fontSize: 17, fontWeight: '600' },
});
