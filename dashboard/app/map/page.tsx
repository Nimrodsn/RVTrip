'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { days, getDateForDay } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import { TYPE_COLORS, TYPE_EMOJI, type LocationType, type RvLocation } from '@/lib/types';
import MapView from '@/components/MapView';

const TYPE_OPTIONS: { key: LocationType; label: string }[] = [
  { key: 'campsite', label: strings.map.campsite },
  { key: 'attraction', label: strings.map.attraction },
  { key: 'supply', label: strings.map.supply },
];

const RV_IDS = ['rv1', 'rv2'] as const;
type RvId = (typeof RV_IDS)[number];
const THROTTLE_MS = 10_000;

type CustomStopRow = {
  id: string;
  day: number;
  name: string;
  type: LocationType;
  lat: number;
  lng: number;
  note: string;
};

export default function MapPage() {
  const [customStops, setCustomStops] = useState<CustomStopRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [newStop, setNewStop] = useState({
    name: '',
    day: days[0],
    type: 'attraction' as LocationType,
    note: '',
  });
  const [saving, setSaving] = useState(false);

  // Live location state
  const [rvIdentity, setRvIdentity] = useState<RvId | null>(null);
  const [sharing, setSharing] = useState(false);
  const [rvLocations, setRvLocations] = useState<RvLocation[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpsertRef = useRef<number>(0);

  // Load RV identity from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('rv_identity');
    if (stored === 'rv1' || stored === 'rv2') setRvIdentity(stored);
  }, []);

  // Load existing RV locations + subscribe to realtime changes
  useEffect(() => {
    supabase.from('rv_locations').select('*').then(({ data }) => {
      if (data) setRvLocations(data as RvLocation[]);
    });

    const channel = supabase
      .channel('rv_locations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rv_locations' },
        (payload) => {
          const row = (payload.new || payload.old) as RvLocation | undefined;
          if (!row) return;
          setRvLocations((prev) => {
            const idx = prev.findIndex((r) => r.rv_id === row.rv_id);
            if (payload.eventType === 'DELETE') {
              return prev.filter((r) => r.rv_id !== row.rv_id);
            }
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = row;
              return next;
            }
            return [...prev, row];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Geolocation sharing lifecycle
  useEffect(() => {
    if (!sharing || !rvIdentity) return;

    if (!navigator.geolocation) {
      setGpsError(strings.liveLocation.gpsUnavailable);
      setSharing(false);
      return;
    }

    const wId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        const now = Date.now();
        if (now - lastUpsertRef.current < THROTTLE_MS) return;
        lastUpsertRef.current = now;

        supabase
          .from('rv_locations')
          .upsert(
            { rv_id: rvIdentity, lat: pos.coords.latitude, lng: pos.coords.longitude, updated_at: new Date().toISOString() },
            { onConflict: 'rv_id' }
          )
          .then();
      },
      (err) => {
        setGpsError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    watchIdRef.current = wId;

    return () => {
      navigator.geolocation.clearWatch(wId);
      watchIdRef.current = null;
    };
  }, [sharing, rvIdentity]);

  function selectRv(id: RvId) {
    setRvIdentity(id);
    localStorage.setItem('rv_identity', id);
  }

  function toggleSharing() {
    if (!rvIdentity) return;
    setSharing((prev) => !prev);
  }

  useEffect(() => {
    loadStops();
  }, []);

  async function loadStops() {
    const { data } = await supabase.from('custom_stops').select('*');
    if (data) setCustomStops(data as CustomStopRow[]);
  }

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setClickedCoords({ lat, lng });
    setNewStop((prev) => ({ ...prev, name: '', note: '' }));
  }, []);

  async function saveStop() {
    if (!clickedCoords || !newStop.name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('custom_stops')
      .insert({
        day: newStop.day,
        name: newStop.name,
        type: newStop.type,
        lat: clickedCoords.lat,
        lng: clickedCoords.lng,
        note: newStop.note,
      })
      .select()
      .single();
    if (data) {
      setCustomStops((prev) => [...prev, data as CustomStopRow]);
    }
    setClickedCoords(null);
    setNewStop({ name: '', day: days[0], type: 'attraction', note: '' });
    setSaving(false);
  }

  function cancelAdd() {
    setClickedCoords(null);
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar with edit toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <h2 className="font-bold text-primary text-lg">{strings.map.itinerary}</h2>
        <button
          onClick={() => {
            setEditMode(!editMode);
            if (editMode) setClickedCoords(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            editMode
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-primary hover:bg-gray-200'
          }`}
        >
          {editMode ? strings.today.donEditing : strings.today.editPlan}
        </button>
      </div>

      {/* RV identity selector + share toggle */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-500">{strings.liveLocation.iAm}</span>
        {RV_IDS.map((id) => (
          <button
            key={id}
            onClick={() => selectRv(id)}
            className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
              rvIdentity === id
                ? id === 'rv1'
                  ? 'bg-blue-600 text-white'
                  : 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {id === 'rv1' ? strings.liveLocation.rv1 : strings.liveLocation.rv2}
          </button>
        ))}

        {rvIdentity && (
          <button
            onClick={toggleSharing}
            className={`flex items-center gap-2 px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
              sharing
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${sharing ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
            />
            {sharing ? strings.liveLocation.stopSharing : strings.liveLocation.shareLocation}
          </button>
        )}

        {gpsError && (
          <span className="text-xs text-red-500 font-medium">{gpsError}</span>
        )}

        {/* Show live status badges for both RVs */}
        {rvLocations.map((rv) => {
          const mins = Math.round((Date.now() - new Date(rv.updated_at).getTime()) / 60000);
          const fresh = mins < 5;
          return (
            <span
              key={rv.rv_id}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                rv.rv_id === 'rv1'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-purple-50 text-purple-700 border border-purple-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${fresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {rv.rv_id === 'rv1' ? strings.liveLocation.rv1 : strings.liveLocation.rv2}
              {' '}
              ({mins < 1 ? '<1' : mins} {strings.map.minutes})
            </span>
          );
        })}
      </div>

      {/* Add stop form (slides in when coordinates are clicked) */}
      {editMode && clickedCoords && (
        <div className="bg-green-50 border-b border-green-200 p-4 animate-in slide-in-from-top">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-800">
                {strings.map.addStop}
              </h3>
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded font-mono">
                {clickedCoords.lat.toFixed(5)}, {clickedCoords.lng.toFixed(5)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <input
                placeholder={strings.map.stopName}
                value={newStop.name}
                onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
                autoFocus
              />
              <select
                value={newStop.day}
                onChange={(e) => setNewStop({ ...newStop, day: Number(e.target.value) })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {strings.map.day} {d} — {getDateForDay(d)}
                  </option>
                ))}
              </select>
              <select
                value={newStop.type}
                onChange={(e) => setNewStop({ ...newStop, type: e.target.value as LocationType })}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {TYPE_EMOJI[t.key]} {t.label}
                  </option>
                ))}
              </select>
              <input
                placeholder={strings.map.note}
                value={newStop.note}
                onChange={(e) => setNewStop({ ...newStop, note: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveStop}
                disabled={!newStop.name.trim() || saving}
                className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {saving ? '...' : strings.today.save}
              </button>
              <button
                onClick={cancelAdd}
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                {strings.today.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 min-h-0">
        <MapView
          customStops={customStops}
          editMode={editMode}
          onMapClick={handleMapClick}
          rvLocations={rvLocations}
        />
      </div>
    </div>
  );
}
