'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { strings } from '@/lib/strings';
import { cn } from '@/lib/utils';
import { useMotionEnabled } from '@/lib/useMotionEnabled';
import PageHeader from '@/components/PageHeader';
import { SkeletonCards } from '@/components/Skeleton';
import ProgressSteps from '@/components/react-bits/ProgressSteps';
import StaggerList from '@/components/ui/StaggerList';
import SpotlightTile from '@/components/ui/SpotlightTile';
import HighlightBanner from '@/components/ui/HighlightBanner';
import Button from '@/components/ui/Button';

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

const RV_OPTIONS: { id: RvId; label: string; badge: string }[] = [
  { id: 'rv1', label: strings.liveLocation.rv1, badge: 'bg-blue-600' },
  { id: 'rv2', label: strings.liveLocation.rv2, badge: 'bg-purple-600' },
];

export default function ChecklistPage() {
  const [rvId, setRvId] = useState<RvId | null>(null);
  const [myState, setMyState] = useState<Record<string, boolean>>({});
  const [otherState, setOtherState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const motionEnabled = useMotionEnabled();

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
      <div className="p-4 sm:p-8 max-w-2xl mx-auto">
        <PageHeader
          title={strings.checklist.title}
          subtitle={strings.checklist.selectRv}
          meta={strings.checklist.noRvSelected}
        />
        <StaggerList className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RV_OPTIONS.map((rv) => (
            <SpotlightTile key={rv.id} className="h-full">
              <button
                onClick={() => selectRv(rv.id)}
                className="flex w-full flex-col items-center gap-3 rounded-xl p-8 transition-transform hover:-translate-y-0.5"
              >
                <span className="text-4xl" aria-hidden>
                  🚐
                </span>
                <span className={cn('rounded-full px-4 py-1.5 text-base font-bold text-white', rv.badge)}>
                  {rv.label}
                </span>
              </button>
            </SpotlightTile>
          ))}
        </StaggerList>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title={strings.checklist.title}
          action={
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
                rvId === 'rv1' ? 'bg-blue-600' : 'bg-purple-600'
              }`}
            >
              {myLabel}
            </span>
          }
        />
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
        </div>
        <ProgressSteps
          steps={CHECKLIST_ITEMS.map((item) => ({ label: item.label, complete: !!myState[item.key] }))}
          onStepClick={(index) => toggle(CHECKLIST_ITEMS[index].key)}
        />
      </div>

      {allDone && (
        <HighlightBanner tone="green" className="mb-6" contentClassName="p-4 text-center font-bold">
          ✅ {strings.checklist.allDone}
        </HighlightBanner>
      )}

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <StaggerList className="space-y-3">
          {CHECKLIST_ITEMS.map((item) => {
            const checked = !!myState[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggle(item.key)}
                aria-pressed={checked}
                className={cn(
                  'flex w-full items-center gap-4 rounded-xl border p-4 transition-all',
                  checked ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100 hover:border-gray-200'
                )}
              >
                <ItemIcon checked={checked} emoji={item.emoji} animated={motionEnabled} />
                <span
                  className={cn(
                    'text-sm font-semibold',
                    checked ? 'text-green-700 line-through' : 'text-primary'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </StaggerList>
      )}

      {/* Reset */}
      <Button variant="secondary" onClick={resetAll} className="mt-8 w-full rounded-xl text-gray-600">
        {strings.checklist.resetAll}
      </Button>
    </div>
  );
}

/** Gives the checkbox a quick pop when it flips, so a tap registers at a glance. */
function ItemIcon({ checked, emoji, animated }: { checked: boolean; emoji: string; animated: boolean }) {
  const className = cn(
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg transition-colors',
    checked ? 'bg-green-200' : 'bg-gray-100'
  );
  const content = checked ? '✅' : emoji;

  if (!animated) {
    return <div className={className}>{content}</div>;
  }

  return (
    <motion.div
      data-motion=""
      className={className}
      animate={{ scale: checked ? [1, 1.2, 1] : 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  );
}
