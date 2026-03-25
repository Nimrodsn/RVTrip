'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { itinerary, days, getDateForDay } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import { TYPE_COLORS, TYPE_EMOJI, type DayNote, type CustomStop, type LocationType } from '@/lib/types';

const TYPE_OPTIONS: { key: LocationType; label: string }[] = [
  { key: 'campsite', label: strings.map.campsite },
  { key: 'attraction', label: strings.map.attraction },
  { key: 'supply', label: strings.map.supply },
];

export default function TodayPage() {
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [customStops, setCustomStops] = useState<CustomStop[]>([]);
  const [hiddenStops, setHiddenStops] = useState<string[]>([]);
  const [stopEdits, setStopEdits] = useState<Record<string, { name?: string; note?: string }>>({});
  const [editing, setEditing] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newText, setNewText] = useState('');
  const [editingStop, setEditingStop] = useState<{ key: string; name: string; note: string } | null>(null);
  const [editingCustomStop, setEditingCustomStop] = useState<{ id: string; name: string; note: string; type: LocationType } | null>(null);
  const [showAddStop, setShowAddStop] = useState(false);
  const [newStop, setNewStop] = useState({ name: '', type: 'attraction' as LocationType, note: '', lat: '', lng: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [notesRes, hiddenRes, editsRes, stopsRes] = await Promise.all([
      supabase.from('day_notes').select('*'),
      supabase.from('hidden_stops').select('stop_key'),
      supabase.from('stop_edits').select('*'),
      supabase.from('custom_stops').select('*'),
    ]);
    if (notesRes.data) setDayNotes(notesRes.data as DayNote[]);
    if (hiddenRes.data) setHiddenStops(hiddenRes.data.map((h: { stop_key: string }) => h.stop_key));
    if (editsRes.data) {
      const map: Record<string, { name?: string; note?: string }> = {};
      for (const e of editsRes.data) {
        try {
          const parsed = JSON.parse(e.edited_note);
          if (typeof parsed === 'object' && parsed !== null) {
            map[e.stop_key] = parsed;
          } else {
            map[e.stop_key] = { note: e.edited_note };
          }
        } catch {
          map[e.stop_key] = { note: e.edited_note };
        }
      }
      setStopEdits(map);
    }
    if (stopsRes.data) {
      setCustomStops(
        stopsRes.data.map((s: Record<string, unknown>) => ({
          id: s.id as string,
          day: s.day as number,
          name: s.name as string,
          type: s.type as LocationType,
          coords: { lat: s.lat as number, lng: s.lng as number },
          note: s.note as string,
        }))
      );
    }
  }

  const dayLocations = itinerary.locations.filter(
    (loc) => loc.day === selectedDay && !hiddenStops.includes(`${loc.day}-${loc.name}`)
  );
  const dayCustomStops = customStops.filter((s) => s.day === selectedDay);
  const dayCustomNotes = dayNotes.filter((n) => n.day === selectedDay);

  async function saveStopEdit(stopKey: string, name: string, note: string) {
    const payload = JSON.stringify({ name: name || undefined, note: note || undefined });
    await supabase
      .from('stop_edits')
      .upsert({ stop_key: stopKey, edited_note: payload, updated_at: new Date().toISOString() }, { onConflict: 'stop_key' });
    setStopEdits({ ...stopEdits, [stopKey]: { name: name || undefined, note: note || undefined } });
    setEditingStop(null);
  }

  async function addCustomStop() {
    if (!newStop.name.trim()) return;
    const lat = parseFloat(newStop.lat) || 0;
    const lng = parseFloat(newStop.lng) || 0;
    const { data } = await supabase
      .from('custom_stops')
      .insert({ day: selectedDay, name: newStop.name, type: newStop.type, lat, lng, note: newStop.note })
      .select()
      .single();
    if (data) {
      setCustomStops([...customStops, {
        id: data.id,
        day: data.day,
        name: data.name,
        type: data.type as LocationType,
        coords: { lat: data.lat, lng: data.lng },
        note: data.note,
      }]);
    }
    setNewStop({ name: '', type: 'attraction', note: '', lat: '', lng: '' });
    setShowAddStop(false);
  }

  async function updateCustomStop(id: string, name: string, note: string, type: LocationType) {
    await supabase.from('custom_stops').update({ name, note, type }).eq('id', id);
    setCustomStops(customStops.map((s) => s.id === id ? { ...s, name, note, type } : s));
    setEditingCustomStop(null);
  }

  async function deleteCustomStop(id: string) {
    await supabase.from('custom_stops').delete().eq('id', id);
    setCustomStops(customStops.filter((s) => s.id !== id));
  }

  async function addNote() {
    if (!newText.trim()) return;
    const { data } = await supabase
      .from('day_notes')
      .insert({ day: selectedDay, time: newTime, text: newText, done: false })
      .select()
      .single();
    if (data) setDayNotes([...dayNotes, data as DayNote]);
    setNewTime('');
    setNewText('');
  }

  async function toggleNote(id: string, done: boolean) {
    await supabase.from('day_notes').update({ done }).eq('id', id);
    setDayNotes(dayNotes.map((n) => (n.id === id ? { ...n, done } : n)));
  }

  async function deleteNote(id: string) {
    await supabase.from('day_notes').delete().eq('id', id);
    setDayNotes(dayNotes.filter((n) => n.id !== id));
  }

  async function hideStop(stopKey: string) {
    await supabase.from('hidden_stops').insert({ stop_key: stopKey });
    setHiddenStops([...hiddenStops, stopKey]);
  }

  async function restoreStops() {
    await supabase.from('hidden_stops').delete().neq('stop_key', '');
    setHiddenStops([]);
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-baseline gap-3 mb-6 flex-wrap">
        <h1 className="text-2xl font-extrabold text-primary">{strings.today.title}</h1>
        <span className="text-sm text-gray-500 font-medium">
          {strings.budget.day} {selectedDay} — {getDateForDay(selectedDay)}
        </span>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl font-bold text-sm transition-colors ${
              selectedDay === d
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{d}</span>
            <span className={`text-[10px] font-medium ${selectedDay === d ? 'text-white/80' : 'text-gray-400'}`}>
              {getDateForDay(d).split(' ')[1]}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => setEditing(!editing)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            editing ? 'bg-primary text-white' : 'bg-gray-100 text-primary hover:bg-gray-200'
          }`}
        >
          {editing ? strings.today.donEditing : strings.today.editPlan}
        </button>
        {editing && (
          <button
            onClick={() => setShowAddStop(!showAddStop)}
            className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-semibold hover:bg-green-100 transition-colors"
          >
            {showAddStop ? strings.today.cancel : strings.map.addStop}
          </button>
        )}
        {hiddenStops.length > 0 && (
          <button
            onClick={restoreStops}
            className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-colors"
          >
            {strings.today.restoreStops} ({hiddenStops.length})
          </button>
        )}
      </div>

      {/* Add Custom Stop Form */}
      {showAddStop && (
        <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
          <h3 className="font-semibold text-green-800 mb-3">{strings.map.addStop} - {strings.budget.day} {selectedDay}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              placeholder={strings.map.stopName}
              value={newStop.name}
              onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <select
              value={newStop.type}
              onChange={(e) => setNewStop({ ...newStop, type: e.target.value as LocationType })}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.key} value={t.key}>{TYPE_EMOJI[t.key]} {t.label}</option>
              ))}
            </select>
            <input
              placeholder={strings.map.latitude}
              value={newStop.lat}
              onChange={(e) => setNewStop({ ...newStop, lat: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              type="number"
              step="any"
            />
            <input
              placeholder={strings.map.longitude}
              value={newStop.lng}
              onChange={(e) => setNewStop({ ...newStop, lng: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
              type="number"
              step="any"
            />
          </div>
          <input
            placeholder={strings.map.note}
            value={newStop.note}
            onChange={(e) => setNewStop({ ...newStop, note: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
          />
          <button
            onClick={addCustomStop}
            disabled={!newStop.name.trim()}
            className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {strings.today.save}
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-3">
        {dayLocations.length === 0 && dayCustomStops.length === 0 && dayCustomNotes.length === 0 && (
          <p className="text-gray-400 text-center py-8">{strings.today.noStops}</p>
        )}

        {/* Itinerary stops */}
        {dayLocations.map((loc, i) => {
          const key = `${loc.day}-${loc.name}`;
          const edits = stopEdits[key] || {};
          const displayName = edits.name || loc.name;
          const displayNote = edits.note || loc.note;
          const isEditing = editingStop?.key === key;

          return (
            <div
              key={key}
              className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: TYPE_COLORS[loc.type].bg }}
                >
                  {TYPE_EMOJI[loc.type]}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editingStop.name}
                        onChange={(e) => setEditingStop({ ...editingStop, name: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm font-bold"
                        placeholder={strings.map.stopName}
                      />
                      <input
                        value={editingStop.note}
                        onChange={(e) => setEditingStop({ ...editingStop, note: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        placeholder={strings.map.note}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveStopEdit(key, editingStop.name, editingStop.note)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
                        >
                          {strings.today.save}
                        </button>
                        <button
                          onClick={() => setEditingStop(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
                        >
                          {strings.today.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-primary">{displayName}</h3>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: TYPE_COLORS[loc.type].bg, color: TYPE_COLORS[loc.type].text }}
                        >
                          {strings.today.stopOf} {i + 1}
                        </span>
                        {edits.name && (
                          <span className="text-xs text-gray-400">(מקור: {loc.name})</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{displayNote}</p>
                      {loc.currencyAlert && (
                        <div className="mt-2 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg inline-block">
                          ⚠️ {strings.commander.currencyAlertTitle}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {editing && !isEditing && (
                    <>
                      <button
                        onClick={() => setEditingStop({ key, name: displayName, note: displayNote })}
                        className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                      >
                        ✏️ {strings.today.editNote}
                      </button>
                      <button
                        onClick={() => hideStop(key)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                      >
                        🗑️ {strings.today.deleteStop}
                      </button>
                    </>
                  )}
                  {loc.url && (
                    <a
                      href={loc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      🌐 {strings.map.website} ↗
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${loc.coords.lat},${loc.coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {strings.today.navigateNow} ↗
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {/* Custom stops */}
        {dayCustomStops.map((stop) => {
          const isEditing = editingCustomStop?.id === stop.id;
          return (
            <div key={stop.id} className="p-4 bg-white rounded-xl border-2 border-dashed border-gray-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ring-2 ring-yellow-400"
                  style={{ backgroundColor: TYPE_COLORS[stop.type].bg }}
                >
                  {TYPE_EMOJI[stop.type]}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editingCustomStop.name}
                        onChange={(e) => setEditingCustomStop({ ...editingCustomStop, name: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm font-bold"
                      />
                      <select
                        value={editingCustomStop.type}
                        onChange={(e) => setEditingCustomStop({ ...editingCustomStop, type: e.target.value as LocationType })}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm"
                      >
                        {TYPE_OPTIONS.map((t) => (
                          <option key={t.key} value={t.key}>{TYPE_EMOJI[t.key]} {t.label}</option>
                        ))}
                      </select>
                      <input
                        value={editingCustomStop.note}
                        onChange={(e) => setEditingCustomStop({ ...editingCustomStop, note: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-sm"
                        placeholder={strings.map.note}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCustomStop(stop.id, editingCustomStop.name, editingCustomStop.note, editingCustomStop.type)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
                        >
                          {strings.today.save}
                        </button>
                        <button
                          onClick={() => setEditingCustomStop(null)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
                        >
                          {strings.today.cancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-primary">{stop.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-medium border border-yellow-200">
                          {strings.map.custom}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{stop.note}</p>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {editing && !isEditing && (
                    <>
                      <button
                        onClick={() => setEditingCustomStop({ id: stop.id, name: stop.name, note: stop.note, type: stop.type })}
                        className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                      >
                        ✏️ {strings.today.editNote}
                      </button>
                      <button
                        onClick={() => deleteCustomStop(stop.id)}
                        className="text-red-400 hover:text-red-600 text-xs font-medium"
                      >
                        🗑️ {strings.today.deleteItem}
                      </button>
                    </>
                  )}
                  {stop.coords.lat !== 0 && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${stop.coords.lat},${stop.coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {strings.today.navigateNow} ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Custom day notes */}
        {dayCustomNotes.map((note) => (
          <div
            key={note.id}
            className={`flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm ${
              note.done ? 'opacity-50' : ''
            }`}
          >
            <button
              onClick={() => toggleNote(note.id, !note.done)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 border-2 ${
                note.done ? 'bg-green-100 border-green-300' : 'bg-gray-50 border-gray-200'
              }`}
            >
              {note.done ? '✅' : '📝'}
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {note.time && <span className="text-sm font-semibold text-gray-600">{note.time}</span>}
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                  {strings.today.customItem}
                </span>
              </div>
              <p className={`text-sm mt-1 ${note.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                {note.text}
              </p>
            </div>
            {editing && (
              <button
                onClick={() => deleteNote(note.id)}
                className="text-red-400 hover:text-red-600 text-sm shrink-0"
              >
                {strings.today.deleteItem}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Note */}
      {editing && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-primary mb-3">{strings.today.addItem}</h3>
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <input
              placeholder={strings.today.time}
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-24 px-3 py-2 border rounded-lg text-sm"
            />
            <input
              placeholder={strings.today.activity}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              className="flex-1 min-w-[150px] px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={addNote}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
            >
              {strings.today.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
