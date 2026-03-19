'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';

const CHECKLIST_ITEMS = [
  { key: 'roofHatch', label: strings.checklist.roofHatch, emoji: '🏠' },
  { key: 'stepRetracted', label: strings.checklist.stepRetracted, emoji: '🪜' },
  { key: 'gasOff', label: strings.checklist.gasOff, emoji: '🔥' },
  { key: 'cabinetsLocked', label: strings.checklist.cabinetsLocked, emoji: '🔒' },
  { key: 'greyWaterEmpty', label: strings.checklist.greyWaterEmpty, emoji: '🚿' },
  { key: 'waterFull', label: strings.checklist.waterFull, emoji: '💧' },
  { key: 'fridgeOk', label: strings.checklist.fridgeOk, emoji: '❄️' },
  { key: 'tiresOk', label: strings.checklist.tiresOk, emoji: '🛞' },
];

export default function ChecklistPage() {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();

    const channel = supabase
      .channel('checklist-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist' }, () => {
        loadChecklist();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadChecklist() {
    const { data } = await supabase.from('checklist').select('*');
    const map: Record<string, boolean> = {};
    if (data) {
      for (const row of data) map[row.key] = row.checked;
    }
    setState(map);
    setLoading(false);
  }

  async function toggle(key: string) {
    const newVal = !state[key];
    setState({ ...state, [key]: newVal });
    await supabase
      .from('checklist')
      .upsert({ key, checked: newVal, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  }

  async function resetAll() {
    await supabase.from('checklist').delete().neq('key', '');
    setState({});
  }

  const doneCount = Object.values(state).filter(Boolean).length;
  const allDone = doneCount >= CHECKLIST_ITEMS.length;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-primary mb-6">{strings.checklist.title}</h1>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-600">
            {strings.checklist.completed}: {doneCount}/{CHECKLIST_ITEMS.length}
          </span>
          {allDone && (
            <span className="text-sm font-bold text-green-600">✅ {strings.checklist.allDone}</span>
          )}
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(doneCount / CHECKLIST_ITEMS.length) * 100}%`,
              backgroundColor: allDone ? '#2e7d32' : '#1a1a1a',
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">טוען...</div>
      ) : (
        <div className="space-y-3">
          {CHECKLIST_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => toggle(item.key)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                state[item.key]
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${
                  state[item.key] ? 'bg-green-200' : 'bg-gray-100'
                }`}
              >
                {state[item.key] ? '✅' : item.emoji}
              </div>
              <span
                className={`text-sm font-semibold ${
                  state[item.key] ? 'text-green-700 line-through' : 'text-primary'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Reset */}
      <button
        onClick={resetAll}
        className="mt-8 w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
      >
        {strings.checklist.resetAll}
      </button>
    </div>
  );
}
