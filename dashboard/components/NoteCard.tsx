'use client';

import { useState } from 'react';
import { strings } from '@/lib/strings';
import { sortItems } from '@/lib/notesStore';
import { cn } from '@/lib/utils';
import type { NoteColor, SharedNote, SharedNoteItem } from '@/lib/types';

const COLORS: Record<NoteColor, string> = {
  yellow: 'bg-amber-50 border-amber-200',
  green: 'bg-green-50 border-green-200',
  blue: 'bg-blue-50 border-blue-200',
  pink: 'bg-pink-50 border-pink-200',
  gray: 'bg-white border-gray-200',
};

const SWATCHES: Record<NoteColor, string> = {
  yellow: 'bg-amber-300',
  green: 'bg-green-300',
  blue: 'bg-blue-300',
  pink: 'bg-pink-300',
  gray: 'bg-gray-200',
};

const COLOR_ORDER: NoteColor[] = ['yellow', 'green', 'blue', 'pink', 'gray'];

const AUTHOR_LABELS: Record<string, string> = {
  rv1: strings.liveLocation.rv1,
  rv2: strings.liveLocation.rv2,
};

interface Props {
  note: SharedNote;
  items: SharedNoteItem[];
  onPatch: (patch: Partial<SharedNote>) => void;
  onDelete: () => void;
  onAddItem: (text: string) => void;
  onToggleItem: (item: SharedNoteItem) => void;
  onItemText: (item: SharedNoteItem, text: string) => void;
  onDeleteItem: (item: SharedNoteItem) => void;
}

export default function NoteCard({
  note,
  items,
  onPatch,
  onDelete,
  onAddItem,
  onToggleItem,
  onItemText,
  onDeleteItem,
}: Props) {
  const [draft, setDraft] = useState('');

  const ordered = sortItems(items);
  const left = items.filter((item) => !item.done).length;
  const author = AUTHOR_LABELS[note.author];
  const updated = new Date(note.updated_at).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  function commitDraft() {
    const text = draft.trim();
    if (!text) return;
    onAddItem(text);
    setDraft('');
  }

  return (
    <div className={cn('flex h-full flex-col rounded-xl border p-4', COLORS[note.color] ?? COLORS.gray)}>
      <div className="flex items-start gap-2">
        <input
          value={note.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder={strings.notes.titlePlaceholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-primary outline-none placeholder:text-gray-400"
        />
        <button
          onClick={() => onPatch({ pinned: !note.pinned })}
          title={note.pinned ? strings.notes.unpin : strings.notes.pin}
          aria-label={note.pinned ? strings.notes.unpin : strings.notes.pin}
          className={cn('shrink-0 rounded px-1 text-sm', note.pinned ? 'opacity-100' : 'opacity-30')}
        >
          📌
        </button>
      </div>

      {note.kind === 'checklist' ? (
        <div className="mt-3 flex-1">
          <ul className="space-y-1">
            {ordered.map((item) => (
              <li key={item.id} className="group flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onToggleItem(item)}
                  aria-label={item.text}
                  className="h-4 w-4 shrink-0 accent-green-600"
                />
                <input
                  value={item.text}
                  onChange={(e) => onItemText(item, e.target.value)}
                  className={cn(
                    'min-w-0 flex-1 bg-transparent text-sm outline-none',
                    item.done ? 'text-gray-400 line-through' : 'text-primary'
                  )}
                />
                <button
                  onClick={() => onDeleteItem(item)}
                  aria-label={strings.notes.delete}
                  className="shrink-0 px-1 text-xs text-gray-300 hover:text-red-500"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-300" aria-hidden>
              +
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDraft();
                }
              }}
              placeholder={strings.notes.itemPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      ) : (
        <textarea
          value={note.body}
          onChange={(e) => onPatch({ body: e.target.value })}
          placeholder={strings.notes.notePlaceholder}
          rows={5}
          className="mt-3 flex-1 resize-y bg-transparent text-sm leading-relaxed text-primary outline-none placeholder:text-gray-400"
        />
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-2">
        <div className="flex items-center gap-1">
          {COLOR_ORDER.map((color) => (
            <button
              key={color}
              onClick={() => onPatch({ color })}
              aria-label={`${strings.notes.color} ${color}`}
              className={cn(
                'h-4 w-4 rounded-full border',
                SWATCHES[color],
                note.color === color ? 'border-gray-600' : 'border-black/10'
              )}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {note.kind === 'checklist' && (
            <span>{left > 0 ? `${strings.notes.itemsLeft} ${left}` : strings.notes.allDone}</span>
          )}
          <button
            onClick={() => {
              if (confirm(strings.notes.confirmDelete)) onDelete();
            }}
            aria-label={strings.notes.delete}
            className="text-gray-300 hover:text-red-500"
          >
            🗑
          </button>
        </div>
      </div>

      <p className="mt-2 text-[10px] text-gray-400">
        {author && <span>{author} · </span>}
        {strings.notes.updated} {updated}
      </p>
    </div>
  );
}
