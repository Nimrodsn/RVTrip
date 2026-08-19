'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { strings } from '@/lib/strings';
import {
  dropPending,
  enqueue,
  mergeFetched,
  mergeRemote,
  newId,
  pendingCount,
  readSnapshot,
  sortNotes,
  writeSnapshot,
  type Snapshot,
} from '@/lib/notesStore';
import { fetchBoard, flush, subscribeToBoard } from '@/lib/notesSync';
import type { NoteKind, SharedNote, SharedNoteItem } from '@/lib/types';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import NoteCard from '@/components/NoteCard';
import { SkeletonCards } from '@/components/Skeleton';
import StaggerList from '@/components/ui/StaggerList';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

/** Typing collapses into one queued edit; this is how long we wait before sending it. */
const SEND_DELAY_MS = 700;

const EMPTY: Snapshot = { notes: [], items: [] };

function now(): string {
  return new Date().toISOString();
}

export default function NotesPage() {
  const [board, setBoard] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(0);
  const [author, setAuthor] = useState('');

  const sendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sync = useCallback(async () => {
    const { remaining } = await flush();
    setPending(remaining);
  }, []);

  /** Send soon rather than on every keystroke. Toggles and deletes call sync directly instead. */
  const syncSoon = useCallback(() => {
    if (sendTimer.current) clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(sync, SEND_DELAY_MS);
  }, [sync]);

  const apply = useCallback((next: Snapshot) => {
    setBoard(next);
    writeSnapshot(next);
    setPending(pendingCount());
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('rv_identity');
    if (stored) setAuthor(stored);

    // The snapshot renders first, so the board is usable before, or without, the network.
    setBoard(readSnapshot());
    setPending(pendingCount());

    let active = true;

    (async () => {
      await sync();
      try {
        const server = await fetchBoard();
        if (!active) return;
        const merged = mergeFetched(readSnapshot(), server);
        setBoard(merged);
        writeSnapshot(merged);
      } catch {
        // Offline: the snapshot above is the whole board until the connection returns.
      } finally {
        if (active) setLoading(false);
      }
    })();

    const unsubscribe = subscribeToBoard((change) => {
      setBoard((current) => {
        const next = mergeRemote(current, change);
        writeSnapshot(next);
        return next;
      });
    });

    const onOnline = () => void sync();
    window.addEventListener('online', onOnline);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('online', onOnline);
      if (sendTimer.current) clearTimeout(sendTimer.current);
    };
  }, [sync]);

  function createNote(kind: NoteKind, title: string) {
    const note: SharedNote = {
      id: newId(),
      kind,
      title,
      body: '',
      color: kind === 'checklist' ? 'yellow' : 'blue',
      pinned: false,
      author,
      created_at: now(),
      updated_at: now(),
    };
    enqueue('shared_notes', 'upsert', { ...note });
    apply({ ...board, notes: [...board.notes, note] });
    void sync();
  }

  function patchNote(id: string, patch: Partial<SharedNote>) {
    const notes = board.notes.map((note) =>
      note.id === id ? { ...note, ...patch, updated_at: now() } : note
    );
    const updated = notes.find((note) => note.id === id);
    if (updated) enqueue('shared_notes', 'upsert', { ...updated });
    apply({ ...board, notes });
    syncSoon();
  }

  function deleteNote(id: string) {
    const itemIds = board.items.filter((item) => item.note_id === id).map((item) => item.id);
    // The database cascades the items, so queued edits for them would only stall the outbox.
    dropPending('shared_note_items', itemIds);
    enqueue('shared_notes', 'delete', { id });
    apply({
      notes: board.notes.filter((note) => note.id !== id),
      items: board.items.filter((item) => item.note_id !== id),
    });
    void sync();
  }

  function addItem(noteId: string, text: string) {
    const siblings = board.items.filter((item) => item.note_id === noteId);
    const position = siblings.reduce((max, item) => Math.max(max, item.position), 0) + 1;
    const item: SharedNoteItem = { id: newId(), note_id: noteId, text, done: false, position, updated_at: now() };
    enqueue('shared_note_items', 'upsert', { ...item });
    apply({ ...board, items: [...board.items, item] });
    void sync();
  }

  function patchItem(id: string, patch: Partial<SharedNoteItem>, immediate: boolean) {
    const items = board.items.map((item) =>
      item.id === id ? { ...item, ...patch, updated_at: now() } : item
    );
    const updated = items.find((item) => item.id === id);
    if (updated) enqueue('shared_note_items', 'upsert', { ...updated });
    apply({ ...board, items });
    if (immediate) void sync();
    else syncSoon();
  }

  function deleteItem(id: string) {
    enqueue('shared_note_items', 'delete', { id });
    apply({ ...board, items: board.items.filter((item) => item.id !== id) });
    void sync();
  }

  const notes = sortNotes(board.notes);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <PageHeader
        title={strings.notes.title}
        subtitle={strings.notes.subtitle}
        meta={pending > 0 ? `${pending} ${strings.notes.pendingSync}` : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => createNote('checklist', strings.notes.untitledList)}>
              {strings.notes.newList}
            </Button>
            <Button variant="secondary" onClick={() => createNote('text', '')}>
              {strings.notes.newNote}
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        {loading && notes.length === 0 ? (
          <SkeletonCards count={3} />
        ) : notes.length === 0 ? (
          <Card>
            <EmptyState
              emoji="📝"
              title={strings.notes.empty}
              description={strings.notes.emptyHint}
              action={
                <Button onClick={() => createNote('checklist', strings.notes.shoppingList)}>
                  {strings.notes.createShoppingList}
                </Button>
              }
            />
          </Card>
        ) : (
          <StaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                items={board.items.filter((item) => item.note_id === note.id)}
                onPatch={(patch) => patchNote(note.id, patch)}
                onDelete={() => deleteNote(note.id)}
                onAddItem={(text) => addItem(note.id, text)}
                onToggleItem={(item) => patchItem(item.id, { done: !item.done }, true)}
                onItemText={(item, text) => patchItem(item.id, { text }, false)}
                onDeleteItem={(item) => deleteItem(item.id)}
              />
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}
