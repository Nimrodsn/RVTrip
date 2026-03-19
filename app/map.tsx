import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Platform, ScrollView, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import itineraryData from '../src/data/itinerary.json';
import type { Itinerary, ItineraryLocation, LocationType } from '../src/types/itinerary';
import { strings } from '../src/constants/strings';
import { fetchDirections } from '../src/services/directions';
import { loadStopEdits, saveStopEdits, loadHiddenStops, saveHiddenStops, loadCustomStops, saveCustomStops } from '../src/services/storage';
import type { CustomStop } from '../src/services/storage';

const itinerary = itineraryData as Itinerary;

const CZ_SK_REGION = {
  latitude: 49.5,
  longitude: 18,
  latitudeDelta: 4.5,
  longitudeDelta: 8,
};

const ALL_DAYS = Array.from(new Set(itinerary.locations.map((l) => l.day))).sort((a, b) => a - b);
const ALL_TYPES: LocationType[] = ['campsite', 'attraction', 'supply'];

const TYPE_LABELS: Record<LocationType, string> = {
  campsite: strings.map.campsite,
  attraction: strings.map.attraction,
  supply: strings.map.supply,
};

const TYPE_COLORS: Record<LocationType, { bg: string; border: string; badge: string; pin: string }> = {
  campsite: { bg: '#e8f5e9', border: '#c8e6c9', badge: '#2e7d32', pin: '#2e7d32' },
  attraction: { bg: '#ffebee', border: '#ffcdd2', badge: '#c62828', pin: '#c62828' },
  supply: { bg: '#e3f2fd', border: '#bbdefb', badge: '#1565c0', pin: '#1565c0' },
};

function streetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}`;
}

function openStreetView(lat: number, lng: number) {
  Linking.openURL(streetViewUrl(lat, lng)).catch(() => {});
}

function openNavigation(lat: number, lng: number) {
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`).catch(() => {});
}

function FilterBar({
  selectedDay,
  setSelectedDay,
  selectedType,
  setSelectedType,
}: {
  selectedDay: number | null;
  setSelectedDay: (d: number | null) => void;
  selectedType: LocationType | null;
  setSelectedType: (t: LocationType | null) => void;
}) {
  return (
    <View style={filterStyles.container}>
      <Text style={filterStyles.label}>{strings.map.filterByDay}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterStyles.row}>
        <Pressable
          style={[filterStyles.pill, selectedDay === null && filterStyles.pillActive]}
          onPress={() => setSelectedDay(null)}
        >
          <Text style={[filterStyles.pillText, selectedDay === null && filterStyles.pillTextActive]}>
            {strings.map.filterAll}
          </Text>
        </Pressable>
        {ALL_DAYS.map((day) => (
          <Pressable
            key={day}
            style={[filterStyles.pill, selectedDay === day && filterStyles.pillActive]}
            onPress={() => setSelectedDay(selectedDay === day ? null : day)}
          >
            <Text style={[filterStyles.pillText, selectedDay === day && filterStyles.pillTextActive]}>
              {day}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={filterStyles.label}>{strings.map.filterByType}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={filterStyles.row}>
        <Pressable
          style={[filterStyles.pill, selectedType === null && filterStyles.pillActive]}
          onPress={() => setSelectedType(null)}
        >
          <Text style={[filterStyles.pillText, selectedType === null && filterStyles.pillTextActive]}>
            {strings.map.filterAll}
          </Text>
        </Pressable>
        {ALL_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[
              filterStyles.pill,
              selectedType === type && { backgroundColor: TYPE_COLORS[type].badge },
            ]}
            onPress={() => setSelectedType(selectedType === type ? null : type)}
          >
            <Text
              style={[
                filterStyles.pillText,
                selectedType === type && filterStyles.pillTextActive,
              ]}
            >
              {TYPE_LABELS[type]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function stopKey(loc: ItineraryLocation): string {
  return `${loc.day}::${loc.name}`;
}

interface LocationCardProps {
  loc: ItineraryLocation;
  editing: boolean;
  noteOverride?: string;
  onEditNote?: (key: string, currentNote: string) => void;
  onHide?: (key: string) => void;
}

function LocationCard({ loc, editing, noteOverride, onEditNote, onHide }: LocationCardProps) {
  const colors = TYPE_COLORS[loc.type];
  const label = TYPE_LABELS[loc.type];
  const isSupply = loc.type === 'supply';
  const displayNote = noteOverride ?? loc.note;

  const [travelInfo, setTravelInfo] = useState<string | null>(null);
  const [loadingTravel, setLoadingTravel] = useState(false);

  async function handleTravelTime() {
    if (loadingTravel || travelInfo) return;
    setLoadingTravel(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setTravelInfo('אין הרשאת מיקום');
        setLoadingTravel(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await fetchDirections(
        pos.coords.latitude,
        pos.coords.longitude,
        loc.coords.lat,
        loc.coords.lng,
      );
      if (result) {
        const mins = Math.round(result.durationSeconds / 60);
        const km = (result.distanceMeters / 1000).toFixed(1);
        setTravelInfo(`${mins} ${strings.map.minutes}, ${km} ${strings.map.km}`);
      } else {
        setTravelInfo('לא זמין');
      }
    } catch {
      setTravelInfo('שגיאה');
    }
    setLoadingTravel(false);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDay}>יום {loc.day}</Text>
        <View style={styles.cardBadgeRow}>
          {isSupply && <Text style={styles.supplyIcon}>🛒</Text>}
          <Text style={[styles.cardType, { backgroundColor: colors.badge }]}>{label}</Text>
        </View>
      </View>
      <Text style={styles.cardName}>{loc.name}</Text>
      <Text style={styles.cardNote}>{displayNote}</Text>

      {editing && (
        <View style={styles.editRow}>
          <Pressable style={styles.editNoteBtn} onPress={() => onEditNote?.(stopKey(loc), displayNote)}>
            <Text style={styles.editNoteBtnText}>✏️ {strings.today.editNote}</Text>
          </Pressable>
          <Pressable style={styles.hideStopBtn} onPress={() => onHide?.(stopKey(loc))}>
            <Text style={styles.hideStopBtnText}>✕ {strings.today.deleteStop}</Text>
          </Pressable>
        </View>
      )}

      {isSupply && (
        <View style={styles.travelRow}>
          {travelInfo ? (
            <Text style={styles.travelResult}>{travelInfo}</Text>
          ) : (
            <Pressable style={styles.travelBtn} onPress={handleTravelTime} disabled={loadingTravel}>
              {loadingTravel ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.travelBtnText}>{strings.map.travelTime}</Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.cardActions}>
        <Pressable style={styles.navBtn} onPress={() => openNavigation(loc.coords.lat, loc.coords.lng)}>
          <Text style={styles.navBtnText}>{strings.map.navigate}</Text>
        </Pressable>
        <Pressable style={styles.svBtn} onPress={() => openStreetView(loc.coords.lat, loc.coords.lng)}>
          <Text style={styles.svBtnText}>{strings.map.viewEntrance}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function buildGoogleMapsHtml(locations: ItineraryLocation[], apiKey: string, routeCoords: number[][] | null): string {
  const locJson = JSON.stringify(locations.map((l) => ({
    lat: l.coords.lat, lng: l.coords.lng,
    name: l.name, type: l.type, day: l.day, note: l.note,
    color: TYPE_COLORS[l.type].pin,
    emoji: l.type === 'supply' ? '🛒' : l.type === 'campsite' ? '⛺' : '🎯',
    label: TYPE_LABELS[l.type],
  })));

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%}
.marker-pin{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;border:2px solid #fff;color:#fff;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.3)}
</style>
</head><body>
<div id="map"></div>
<script>
var locs=${locJson};
var routeGeo=${routeCoords ? JSON.stringify(routeCoords) : '[]'};
async function initMap(){
  var {Map}=await google.maps.importLibrary('maps');
  var {AdvancedMarkerElement}=await google.maps.importLibrary('marker');
  var bounds=new google.maps.LatLngBounds();
  var map=new Map(document.getElementById('map'),{zoom:7,center:{lat:49.5,lng:18},mapTypeControl:false,streetViewControl:false,mapId:'DEMO_MAP_ID'});
  var iw=new google.maps.InfoWindow();
  locs.forEach(function(l){
    var pos={lat:l.lat,lng:l.lng};
    bounds.extend(pos);
    var pin=document.createElement('div');
    pin.className='marker-pin';
    pin.style.backgroundColor=l.color;
    pin.textContent=String(l.day);
    pin.title=l.name;
    var m=new AdvancedMarkerElement({position:pos,map:map,content:pin,title:l.name});
    m.addListener('click',function(){
      iw.setContent('<div dir="rtl" style="text-align:right;font-family:sans-serif;min-width:180px;padding:4px"><b>'+l.emoji+' '+l.name+'</b><br/><span style="color:'+l.color+';font-weight:600">'+l.label+' · יום '+l.day+'</span><br/><span style="color:#555;font-size:13px">'+l.note+'</span></div>');
      iw.open({anchor:m,map:map});
    });
  });
  if(locs.length>0)map.fitBounds(bounds,{top:30,bottom:30,left:30,right:30});
  if(typeof routeGeo!=='undefined'&&routeGeo.length>0){
    var path=routeGeo.map(function(c){return{lat:c[1],lng:c[0]};});
    new google.maps.Polyline({path:path,map:map,strokeColor:'#1565c0',strokeWeight:4,strokeOpacity:0.7});
  }else if(locs.length>=2){
    var fallback=locs.map(function(l){return{lat:l.lat,lng:l.lng};});
    new google.maps.Polyline({path:fallback,map:map,geodesic:true,strokeColor:'#1a1a1a',strokeWeight:2,strokeOpacity:0.4,icons:[{icon:{path:'M 0,-1 0,1',strokeOpacity:1,scale:3},offset:'0',repeat:'16px'}]});
  }
}
</script>
<script src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap" async defer><\/script>
</body></html>`;
}

function buildLeafletHtml(locations: ItineraryLocation[], routeCoords: number[][] | null): string {
  const markers = locations.map((loc) => {
    const color = TYPE_COLORS[loc.type].pin;
    const emoji = loc.type === 'supply' ? '🛒' : loc.type === 'campsite' ? '⛺' : '🎯';
    const label = TYPE_LABELS[loc.type];
    return `L.circleMarker([${loc.coords.lat}, ${loc.coords.lng}], {
      radius: 10, fillColor: '${color}', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
    }).addTo(map).bindPopup('<div dir="rtl" style="text-align:right;font-family:sans-serif"><b>${emoji} ${loc.name}</b><br/><span style="color:${color};font-weight:600">${label} · יום ${loc.day}</span><br/><span style="color:#555">${loc.note}</span></div>');`;
  }).join('\n');
  const polyCoords = locations.map((l) => `[${l.coords.lat}, ${l.coords.lng}]`).join(',');
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map').setView([49.5,18],7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OSM',maxZoom:18}).addTo(map);
${markers}
var c=[${polyCoords}];
var rg=${routeCoords ? JSON.stringify(routeCoords.map(function(p: number[]) { return [p[1], p[0]]; })) : '[]'};
if(c.length>0){map.fitBounds(c,{padding:[30,30]});}
if(rg.length>0){
  L.polyline(rg,{color:'#1565c0',weight:4,opacity:0.7}).addTo(map);
}else if(c.length>1){
  L.polyline(c,{color:'#1a1a1a',weight:2,opacity:0.5,dashArray:'8,6'}).addTo(map);
}
<\/script></body></html>`;
}

function useOsrmRoute(locations: ItineraryLocation[]): number[][] | null {
  const [route, setRoute] = useState<number[][] | null>(null);
  useEffect(() => {
    if (locations.length < 2) { setRoute(null); return; }
    const coords = locations.map((l) => `${l.coords.lng},${l.coords.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === 'Ok' && data.routes?.[0]) {
          setRoute(data.routes[0].geometry.coordinates);
        }
      })
      .catch(() => {});
  }, [locations]);
  return route;
}

function WebMapEmbed({ locations, fullscreen }: { locations: ItineraryLocation[]; fullscreen: boolean }) {
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined;
  const routeCoords = useOsrmRoute(locations);
  const html = useMemo(
    () => apiKey ? buildGoogleMapsHtml(locations, apiKey, routeCoords) : buildLeafletHtml(locations, routeCoords),
    [locations, apiKey, routeCoords],
  );
  const dataUrl = useMemo(() => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`, [html]);

  return (
    <View style={fullscreen ? styles.embedFullscreen : styles.embedContainer}>
      {/* @ts-ignore — iframe is valid on web */}
      <iframe
        key={`${locations.length}-${!!apiKey}-${routeCoords ? 'r' : 'n'}`}
        src={dataUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="geolocation"
      />
    </View>
  );
}

function NativeMap({ locations }: { locations: ItineraryLocation[] }) {
  const MapView = require('react-native-maps').default;
  const { Marker, Callout, PROVIDER_GOOGLE } = require('react-native-maps');
  const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined;

  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      provider={apiKey ? PROVIDER_GOOGLE : undefined}
      initialRegion={CZ_SK_REGION}
      mapType="standard"
    >
      {locations.map((loc, index) => (
        <Marker
          key={`${loc.day}-${loc.name}-${index}`}
          coordinate={{ latitude: loc.coords.lat, longitude: loc.coords.lng }}
          title={loc.name}
          description={loc.note}
          pinColor={TYPE_COLORS[loc.type].pin}
        >
          <Callout tooltip>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{loc.name}</Text>
              <Text style={styles.calloutNote}>{loc.note}</Text>
              <Pressable
                style={styles.streetViewButton}
                onPress={() => openStreetView(loc.coords.lat, loc.coords.lng)}
              >
                <Text style={styles.streetViewButtonText}>{strings.map.viewEntrance}</Text>
              </Pressable>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}

export default function MapScreen() {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<LocationType | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stopEdits, setStopEdits] = useState<Record<string, string>>({});
  const [hiddenStops, setHiddenStops] = useState<string[]>([]);
  const [editModalKey, setEditModalKey] = useState<string | null>(null);
  const [editModalNote, setEditModalNote] = useState('');
  const [customStops, setCustomStops] = useState<CustomStop[]>([]);
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStopName, setNewStopName] = useState('');
  const [newStopDay, setNewStopDay] = useState('1');
  const [newStopType, setNewStopType] = useState<LocationType>('attraction');
  const [newStopLat, setNewStopLat] = useState('');
  const [newStopLng, setNewStopLng] = useState('');
  const [newStopNote, setNewStopNote] = useState('');

  useEffect(() => {
    loadStopEdits().then(setStopEdits);
    loadHiddenStops().then(setHiddenStops);
    loadCustomStops().then(setCustomStops);
  }, []);

  const hiddenSet = useMemo(() => new Set(hiddenStops), [hiddenStops]);

  const allLocations: ItineraryLocation[] = useMemo(() => {
    const custom: ItineraryLocation[] = customStops.map((s) => ({
      day: s.day, name: s.name, type: s.type, coords: s.coords, note: s.note,
    }));
    return [...itinerary.locations, ...custom].sort((a, b) => a.day - b.day);
  }, [customStops]);

  const filtered = useMemo(() => {
    return allLocations.filter((loc) => {
      if (hiddenSet.has(stopKey(loc))) return false;
      if (selectedDay !== null && loc.day !== selectedDay) return false;
      if (selectedType !== null && loc.type !== selectedType) return false;
      return true;
    });
  }, [selectedDay, selectedType, hiddenSet, allLocations]);

  const hiddenFiltered = useMemo(() => {
    return allLocations.filter((loc) => {
      if (!hiddenSet.has(stopKey(loc))) return false;
      if (selectedDay !== null && loc.day !== selectedDay) return false;
      if (selectedType !== null && loc.type !== selectedType) return false;
      return true;
    });
  }, [selectedDay, selectedType, hiddenSet, allLocations]);

  const handleEditNote = useCallback((key: string, currentNote: string) => {
    setEditModalKey(key);
    setEditModalNote(currentNote);
  }, []);

  const saveNote = useCallback(() => {
    if (!editModalKey) return;
    const updated = { ...stopEdits, [editModalKey]: editModalNote };
    setStopEdits(updated);
    saveStopEdits(updated);
    setEditModalKey(null);
    setEditModalNote('');
  }, [editModalKey, editModalNote, stopEdits]);

  const handleHide = useCallback((key: string) => {
    const doHide = () => {
      const updated = [...hiddenStops, key];
      setHiddenStops(updated);
      saveHiddenStops(updated);
    };
    if (Platform.OS === 'web') {
      doHide();
    } else {
      Alert.alert('הסרה', 'להסיר תחנה זו מהמסלול?', [
        { text: 'ביטול', style: 'cancel' },
        { text: 'הסר', style: 'destructive', onPress: doHide },
      ]);
    }
  }, [hiddenStops]);

  const restoreStop = useCallback((key: string) => {
    const updated = hiddenStops.filter((k) => k !== key);
    setHiddenStops(updated);
    saveHiddenStops(updated);
  }, [hiddenStops]);

  const addNewStop = useCallback(() => {
    const lat = parseFloat(newStopLat);
    const lng = parseFloat(newStopLng);
    const day = parseInt(newStopDay, 10);
    if (!newStopName.trim() || isNaN(lat) || isNaN(lng) || isNaN(day)) return;
    const stop: CustomStop = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      day,
      name: newStopName.trim(),
      type: newStopType,
      coords: { lat, lng },
      note: newStopNote.trim(),
    };
    const updated = [...customStops, stop];
    setCustomStops(updated);
    saveCustomStops(updated);
    setNewStopName('');
    setNewStopDay('1');
    setNewStopType('attraction');
    setNewStopLat('');
    setNewStopLng('');
    setNewStopNote('');
    setShowAddStop(false);
  }, [newStopName, newStopDay, newStopType, newStopLat, newStopLng, newStopNote, customStops]);

  return (
    <View style={styles.container}>
      <View style={fullscreen ? styles.mapFullscreenWrap : undefined}>
        {Platform.OS === 'web' ? <WebMapEmbed locations={filtered} fullscreen={fullscreen} /> : <NativeMap locations={filtered} />}
        <Pressable style={styles.fullscreenBtn} onPress={() => setFullscreen((f) => !f)}>
          <Text style={styles.fullscreenBtnText}>{fullscreen ? '⊖' : '⊕'}</Text>
        </Pressable>
      </View>
      {!fullscreen && (
        <>
          <FilterBar
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
          />
          <ScrollView style={styles.locationList} contentContainerStyle={styles.locationListContent}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                {strings.map.itinerary} ({filtered.length})
              </Text>
              <Pressable
                style={editing ? styles.editToggleActive : styles.editToggle}
                onPress={() => setEditing((e) => !e)}
              >
                <Text style={editing ? styles.editToggleTextActive : styles.editToggleText}>
                  {editing ? `✓ ${strings.today.donEditing}` : `✏️ ${strings.today.editPlan}`}
                </Text>
              </Pressable>
            </View>
            {filtered.map((loc, i) => (
              <LocationCard
                key={`${loc.day}-${loc.name}-${i}`}
                loc={loc}
                editing={editing}
                noteOverride={stopEdits[stopKey(loc)]}
                onEditNote={handleEditNote}
                onHide={handleHide}
              />
            ))}
            {editing && hiddenFiltered.length > 0 && (
              <View style={styles.hiddenSection}>
                <Text style={styles.hiddenTitle}>
                  {strings.today.hiddenCount} ({hiddenFiltered.length})
                </Text>
                {hiddenFiltered.map((loc) => {
                  const colors = TYPE_COLORS[loc.type];
                  return (
                    <View key={stopKey(loc)} style={styles.hiddenRow}>
                      <Text style={styles.hiddenName} numberOfLines={1}>{loc.name}</Text>
                      <Pressable
                        style={[styles.restoreBtn, { backgroundColor: colors.badge }]}
                        onPress={() => restoreStop(stopKey(loc))}
                      >
                        <Text style={styles.restoreBtnText}>↩</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            {editing && (
              <Pressable style={styles.addStopBtn} onPress={() => setShowAddStop(true)}>
                <Text style={styles.addStopBtnText}>＋ {strings.map.addStop}</Text>
              </Pressable>
            )}
          </ScrollView>
        </>
      )}

      <Modal visible={editModalKey !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{strings.today.editNote}</Text>
            <TextInput
              style={styles.modalInput}
              value={editModalNote}
              onChangeText={setEditModalNote}
              textAlign="right"
              multiline
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSaveBtn} onPress={saveNote}>
                <Text style={styles.modalSaveBtnText}>{strings.today.save}</Text>
              </Pressable>
              <Pressable style={styles.modalCancelBtn} onPress={() => { setEditModalKey(null); setEditModalNote(''); }}>
                <Text style={styles.modalCancelBtnText}>{strings.today.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showAddStop} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.addStopModal}>
            <Text style={styles.modalTitle}>{strings.map.addStop}</Text>

            <Text style={styles.fieldLabel}>{strings.map.stopName}</Text>
            <TextInput style={styles.modalInput} value={newStopName} onChangeText={setNewStopName} textAlign="right" placeholder={strings.map.stopName} />

            <Text style={styles.fieldLabel}>{strings.map.day}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typePillRow}>
              {ALL_DAYS.map((d) => (
                <Pressable key={d} style={[styles.typePill, newStopDay === String(d) && styles.typePillActive]} onPress={() => setNewStopDay(String(d))}>
                  <Text style={[styles.typePillText, newStopDay === String(d) && styles.typePillTextActive]}>{d}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{strings.map.type}</Text>
            <View style={styles.typePillRow}>
              {ALL_TYPES.map((t) => (
                <Pressable key={t} style={[styles.typePill, newStopType === t && styles.typePillActive]} onPress={() => setNewStopType(t)}>
                  <Text style={[styles.typePillText, newStopType === t && styles.typePillTextActive]}>{TYPE_LABELS[t]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{strings.map.latitude}</Text>
            <TextInput style={styles.modalInput} value={newStopLat} onChangeText={setNewStopLat} placeholder="49.1234" keyboardType="decimal-pad" />

            <Text style={styles.fieldLabel}>{strings.map.longitude}</Text>
            <TextInput style={styles.modalInput} value={newStopLng} onChangeText={setNewStopLng} placeholder="16.5678" keyboardType="decimal-pad" />

            <Text style={styles.fieldLabel}>{strings.map.note}</Text>
            <TextInput style={[styles.modalInput, { minHeight: 60 }]} value={newStopNote} onChangeText={setNewStopNote} textAlign="right" multiline placeholder={strings.map.note} />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSaveBtn} onPress={addNewStop}>
                <Text style={styles.modalSaveBtnText}>{strings.today.save}</Text>
              </Pressable>
              <Pressable style={styles.modalCancelBtn} onPress={() => setShowAddStop(false)}>
                <Text style={styles.modalCancelBtnText}>{strings.today.cancel}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const filterStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'right',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: 6,
    paddingBottom: 10,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 36,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#1a1a1a',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  pillTextActive: {
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  embedContainer: {
    height: 280,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  embedFullscreen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
  },
  mapFullscreenWrap: {
    flex: 1,
  },
  fullscreenBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  fullscreenBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  locationList: {
    flex: 1,
  },
  locationListContent: {
    padding: 16,
    paddingBottom: 48,
  },
  listHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
    color: '#1a1a1a',
  },
  editToggle: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editToggleActive: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
  },
  editToggleText: { fontSize: 12, fontWeight: '700', color: '#555' },
  editToggleTextActive: { fontSize: 12, fontWeight: '700', color: '#fff' },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDay: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
  },
  cardType: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    color: '#fff',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  cardNote: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
    marginBottom: 12,
  },
  cardBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  supplyIcon: {
    fontSize: 16,
  },
  travelRow: {
    marginBottom: 10,
    alignItems: 'flex-end',
  },
  travelBtn: {
    backgroundColor: '#1565c0',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  travelBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  travelResult: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565c0',
    textAlign: 'right',
  },
  cardActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  navBtn: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  svBtn: {
    backgroundColor: '#37474f',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  svBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  callout: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    minWidth: 220,
    maxWidth: 280,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'right',
  },
  calloutNote: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    textAlign: 'right',
  },
  streetViewButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  streetViewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 10,
  },
  editNoteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  editNoteBtnText: { fontSize: 12, fontWeight: '600', color: '#555' },
  hideStopBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  hideStopBtnText: { fontSize: 12, fontWeight: '600', color: '#c62828' },
  hiddenSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  hiddenTitle: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 10, textAlign: 'right' },
  hiddenRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  hiddenName: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right', color: '#999' },
  restoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  restoreBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  addStopBtn: {
    backgroundColor: '#ff9800',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginTop: 12,
  },
  addStopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'right' as const, marginBottom: 6, marginTop: 10 },
  typePillRow: { flexDirection: 'row-reverse' as const, gap: 6, flexWrap: 'wrap' as const, paddingBottom: 4 },
  typePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f0f0f0' },
  typePillActive: { backgroundColor: '#1a1a1a' },
  typePillText: { fontSize: 13, fontWeight: '600', color: '#555' },
  typePillTextActive: { color: '#fff' },
  addStopModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    marginTop: 'auto' as any,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'right', marginBottom: 16, color: '#1a1a1a' },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row-reverse', gap: 10, marginTop: 20 },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalCancelBtnText: { fontSize: 16, fontWeight: '600', color: '#555' },
});
