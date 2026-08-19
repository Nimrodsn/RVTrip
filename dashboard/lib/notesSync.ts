import { supabase } from './supabase';
import { flushOutbox, type Operation, type RemoteChange, type Snapshot } from './notesStore';
import type { SharedNote, SharedNoteItem } from './types';

async function send(operation: Operation): Promise<void> {
  if (operation.type === 'delete') {
    const { error } = await supabase.from(operation.table).delete().eq('id', operation.row.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from(operation.table).upsert(operation.row);
  if (error) throw new Error(error.message);
}

export function flush(): Promise<{ sent: number; remaining: number }> {
  return flushOutbox(send);
}

export async function fetchBoard(): Promise<Snapshot> {
  const [notes, items] = await Promise.all([
    supabase.from('shared_notes').select('*'),
    supabase.from('shared_note_items').select('*'),
  ]);
  if (notes.error) throw new Error(notes.error.message);
  if (items.error) throw new Error(items.error.message);

  return {
    notes: (notes.data ?? []) as SharedNote[],
    items: (items.data ?? []) as SharedNoteItem[],
  };
}

/** Live updates from the other RV. Returns the unsubscribe. */
export function subscribeToBoard(onChange: (change: RemoteChange) => void): () => void {
  const channel = supabase
    .channel('shared-notes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_notes' }, (payload) => {
      const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { id: string };
      if (row?.id) {
        onChange({
          table: 'shared_notes',
          type: payload.eventType.toLowerCase() as RemoteChange['type'],
          row: row as RemoteChange['row'],
        });
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_note_items' }, (payload) => {
      const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as { id: string };
      if (row?.id) {
        onChange({
          table: 'shared_note_items',
          type: payload.eventType.toLowerCase() as RemoteChange['type'],
          row: row as RemoteChange['row'],
        });
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
