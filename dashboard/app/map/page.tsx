'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { days, getDateForDay } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import { TYPE_COLORS, TYPE_EMOJI, type LocationType } from '@/lib/types';
import MapView from '@/components/MapView';

const TYPE_OPTIONS: { key: LocationType; label: string }[] = [
  { key: 'campsite', label: strings.map.campsite },
  { key: 'attraction', label: strings.map.attraction },
  { key: 'supply', label: strings.map.supply },
];

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
        />
      </div>
    </div>
  );
}
