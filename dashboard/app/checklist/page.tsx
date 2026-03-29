'use client';

import { useEffect, useState, useCallback } from 'react';
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

type RvId = 'rv1' | 'rv2';

export default function ChecklistPage() {
  const [rvId, setRvId] = useState<RvId | null>(null);
  const [myState, setMyState] = useState<Record<string, boolean>>({});
  const [otherState, setOtherState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const otherId: RvId | null = rvId === 'rv1' ? 'rv2' : rvId === 'rv2' ? 'rv1' : null;

  useEffect(() => {
    const stored = localStorage.getItem('rv_identity');
    if (stored === 'rv1' || stored === 'rv2') setRvId(stored);
  }, []);

  const loadAll = useCallback(async () => {
    const { data } = await supabase.from('rv_checklist').select('*');
    if (!data) { setLoading(false); return; }
    const mine: Record<string, boolean> = {};
    const other: Record<string, boolean> = {};
    for (const row of data) {
      if (row.rv_id === rvId) mine[row.key] = row.checked;
      else other[row.key] = row.checked;
    }
    setMyState(mine);
    setOtherState(other);
    setLoading(false);
  }, [rvId]);

  useEffect(() => {
    if (!rvId) { setLoading(false); return; }
    loadAll();

    const channel = supabase
      .channel('rv-checklist-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rv_checklist' }, (payload) => {
        const row = payload.new as { rv_id: string; key: string; checked: boolean } | undefined;
        if (!row) return;
        if (row.rv_id === rvId) {
          setMyState((prev) => ({ ...prev, [row.key]: row.checked }));
        } else {
          setOtherState((prev) => ({ ...prev, [row.key]: row.checked }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rvId, loadAll]);

  function selectRv(id: RvId) {
    setRvId(id);
    localStorage.setItem('rv_identity', id);
    setLoading(true);
  }

  async function toggle(key: string) {
    if (!rvId) return;
    const newVal = !myState[key];
    setMyState((prev) => ({ ...prev, [key]: newVal }));
    await supabase
      .from('rv_checklist')
      .upsert(
        { rv_id: rvId, key, checked: newVal, updated_at: new Date().toISOString() },
        { onConflict: 'rv_id,key' }
      );
  }

  async function resetAll() {
    if (!rvId) return;
    await supabase.from('rv_checklist').delete().eq('rv_id', rvId);
    setMyState({});
  }

  const doneCount = Object.values(myState).filter(Boolean).length;
  const allDone = doneCount >= CHECKLIST_ITEMS.length;

  const otherDoneCount = Object.values(otherState).filter(Boolean).length;
  const otherAllDone = otherDoneCount >= CHECKLIST_ITEMS.length;
  const otherLabel = otherId === 'rv1' ? strings.liveLocation.rv1 : strings.liveLocation.rv2;
  const myLabel = rvId === 'rv1' ? strings.liveLocation.rv1 : strings.liveLocation.rv2;

  // RV selector screen
  if (!rvId) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold text-primary mb-6">{strings.checklist.title}</h1>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-lg font-semibold text-gray-700 mb-2">{strings.checklist.selectRv}</p>
          <p className="text-sm text-gray-500 mb-6">{strings.checklist.noRvSelected}</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => selectRv('rv1')}
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors"
            >
              {strings.liveLocation.rv1}
            </button>
            <button
              onClick={() => selectRv('rv2')}
              className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition-colors"
            >
              {strings.liveLocation.rv2}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-extrabold text-primary">{strings.checklist.title}</h1>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
            rvId === 'rv1' ? 'bg-blue-600' : 'bg-purple-600'
          }`}
        >
          {myLabel}
        </span>
      </div>

      {/* Other RV status indicator */}
      {otherId && (
        <div
          className={`mb-6 flex items-center gap-3 p-4 rounded-xl border transition-colors ${
            otherAllDone
              ? 'bg-green-50 border-green-200'
              : 'bg-gray-50 border-gray-200'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full shrink-0 ${
              otherAllDone ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-gray-700">
              {otherLabel}: {otherDoneCount}/{CHECKLIST_ITEMS.length}
            </span>
            <span className="mx-2 text-gray-300">—</span>
            <span
              className={`text-sm font-semibold ${
                otherAllDone ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {otherAllDone ? strings.checklist.readyToRoll : strings.checklist.notReady}
            </span>
          </div>
        </div>
      )}

      {/* My progress */}
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
                myState[item.key]
                  ? 'bg-green-50 border-green-200'
                  : 'bg-white border-gray-100 hover:border-gray-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${
                  myState[item.key] ? 'bg-green-200' : 'bg-gray-100'
                }`}
              >
                {myState[item.key] ? '✅' : item.emoji}
              </div>
              <span
                className={`text-sm font-semibold ${
                  myState[item.key] ? 'text-green-700 line-through' : 'text-primary'
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
