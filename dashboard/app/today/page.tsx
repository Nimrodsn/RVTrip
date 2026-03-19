'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { itinerary, days } from '@/lib/itinerary';
import { strings } from '@/lib/strings';
import { TYPE_COLORS, TYPE_EMOJI, type DayNote } from '@/lib/types';

export default function TodayPage() {
  const [selectedDay, setSelectedDay] = useState(days[0]);
  const [dayNotes, setDayNotes] = useState<DayNote[]>([]);
  const [hiddenStops, setHiddenStops] = useState<string[]>([]);
  const [stopEdits, setStopEdits] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [newTime, setNewTime] = useState('');
  const [newText, setNewText] = useState('');
  const [editingNote, setEditingNote] = useState<{ key: string; value: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [notesRes, hiddenRes, editsRes] = await Promise.all([
      supabase.from('day_notes').select('*'),
      supabase.from('hidden_stops').select('stop_key'),
      supabase.from('stop_edits').select('*'),
    ]);
    if (notesRes.data) setDayNotes(notesRes.data as DayNote[]);
    if (hiddenRes.data) setHiddenStops(hiddenRes.data.map((h: { stop_key: string }) => h.stop_key));
    if (editsRes.data) {
      const map: Record<string, string> = {};
      for (const e of editsRes.data) map[e.stop_key] = e.edited_note;
      setStopEdits(map);
    }
  }

  const dayLocations = itinerary.locations.filter(
    (loc) => loc.day === selectedDay && !hiddenStops.includes(`${loc.day}-${loc.name}`)
  );
  const dayCustomNotes = dayNotes.filter((n) => n.day === selectedDay);

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

  async function saveStopEdit(stopKey: string, note: string) {
    await supabase
      .from('stop_edits')
      .upsert({ stop_key: stopKey, edited_note: note }, { onConflict: 'stop_key' });
    setStopEdits({ ...stopEdits, [stopKey]: note });
    setEditingNote(null);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold text-primary mb-6">{strings.today.title}</h1>

      {/* Day Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`w-10 h-10 rounded-full font-bold text-sm transition-colors ${
              selectedDay === d
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Edit toggle */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setEditing(!editing)}
          className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-primary hover:bg-gray-200 transition-colors"
        >
          {editing ? strings.today.donEditing : strings.today.editPlan}
        </button>
        {hiddenStops.length > 0 && (
          <button
            onClick={restoreStops}
            className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-semibold hover:bg-orange-100 transition-colors"
          >
            {strings.today.restoreStops} ({hiddenStops.length} {strings.today.hiddenCount})
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {dayLocations.length === 0 && dayCustomNotes.length === 0 && (
          <p className="text-gray-400 text-center py-8">{strings.today.noStops}</p>
        )}

        {dayLocations.map((loc, i) => {
          const key = `${loc.day}-${loc.name}`;
          const displayNote = stopEdits[key] ?? loc.note;
          return (
            <div
              key={key}
              className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: TYPE_COLORS[loc.type].bg }}
              >
                {TYPE_EMOJI[loc.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-primary">{loc.name}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: TYPE_COLORS[loc.type].bg,
                      color: TYPE_COLORS[loc.type].text,
                    }}
                  >
                    {strings.today.stopOf} {i + 1}
                  </span>
                </div>
                {editingNote?.key === key ? (
                  <div className="mt-2 flex gap-2">
                    <input
                      value={editingNote.value}
                      onChange={(e) => setEditingNote({ key, value: e.target.value })}
                      className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <button
                      onClick={() => saveStopEdit(key, editingNote.value)}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium"
                    >
                      {strings.today.save}
                    </button>
                    <button
                      onClick={() => setEditingNote(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
                    >
                      {strings.today.cancel}
                    </button>
                  </div>
                ) : (
                  <p
                    className={`text-sm text-gray-500 mt-1 ${editing ? 'cursor-pointer hover:text-primary' : ''}`}
                    onClick={() => editing && setEditingNote({ key, value: displayNote })}
                  >
                    {displayNote}
                    {editing && <span className="text-xs text-blue-500 mr-2">({strings.today.tapToEdit})</span>}
                  </p>
                )}
                {loc.currencyAlert && (
                  <div className="mt-2 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-semibold rounded-lg">
                    ⚠️ {strings.commander.currencyAlertTitle}
                  </div>
                )}
              </div>
              {editing && (
                <button
                  onClick={() => hideStop(key)}
                  className="text-red-400 hover:text-red-600 text-sm shrink-0"
                >
                  {strings.today.deleteStop}
                </button>
              )}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${loc.coords.lat},${loc.coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline shrink-0"
              >
                {strings.today.navigateNow} ↗
              </a>
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
          <div className="flex gap-3">
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
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
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
