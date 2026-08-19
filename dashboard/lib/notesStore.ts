import type { SharedNote, SharedNoteItem } from './types';

/** Mirror of the board, so it renders instantly and stays readable with no network. */
const SNAPSHOT_KEY = 'rv-notes-snapshot';
/** Edits waiting to reach Supabase, kept in the order they were made. */
const OUTBOX_KEY = 'rv-notes-outbox';

export type OutboxTable = 'shared_notes' | 'shared_note_items';

export interface Snapshot {
  notes: SharedNote[];
  items: SharedNoteItem[];
}

export interface Operation {
  seq: number;
  table: OutboxTable;
  type: 'upsert' | 'delete';
  row: { id: string } & Record<string, unknown>;
}

export type Sender = (operation: Operation) => Promise<void>;

const EMPTY: Snapshot = { notes: [], items: [] };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. Edits already in the outbox are unaffected.
  }
}

export function readSnapshot(): Snapshot {
  const stored = read<Partial<Snapshot>>(SNAPSHOT_KEY, EMPTY);
  return { notes: stored.notes ?? [], items: stored.items ?? [] };
}

export function writeSnapshot(snapshot: Snapshot): void {
  write(SNAPSHOT_KEY, snapshot);
}

export function readOutbox(): Operation[] {
  return read<Operation[]>(OUTBOX_KEY, []);
}

function writeOutbox(operations: Operation[]): void {
  write(OUTBOX_KEY, operations);
}

function rowKey(table: OutboxTable, id: string): string {
  return `${table}:${id}`;
}

/**
 * Queues an edit. Repeated edits to the same row collapse into one operation, so holding down a key
 * in a note does not fill the outbox, and a delete replaces anything still queued for that row.
 */
export function enqueue(table: OutboxTable, type: 'upsert' | 'delete', row: { id: string } & Record<string, unknown>): void {
  const operations = readOutbox();
  const existing = operations.findIndex((op) => rowKey(op.table, op.row.id) === rowKey(table, row.id));

  if (existing === -1) {
    const seq = operations.length > 0 ? operations[operations.length - 1].seq + 1 : 1;
    operations.push({ seq, table, type, row });
    writeOutbox(operations);
    return;
  }

  const previous = operations[existing];
  operations[existing] =
    type === 'delete'
      ? { ...previous, type, row: { id: row.id } }
      : { ...previous, type, row: { ...previous.row, ...row } };
  writeOutbox(operations);
}

export function pendingCount(): number {
  return readOutbox().length;
}

export function hasPending(table: OutboxTable, id: string): boolean {
  return readOutbox().some((op) => rowKey(op.table, op.row.id) === rowKey(table, id));
}

/**
 * Sends queued edits oldest first and stops at the first failure, so a note always reaches the
 * server before the items that point at it and nothing is sent twice.
 */
export async function flushOutbox(send: Sender): Promise<{ sent: number; remaining: number }> {
  const operations = readOutbox();
  let sent = 0;

  for (const operation of operations) {
    try {
      await send(operation);
      sent += 1;
    } catch {
      break;
    }
  }

  if (sent > 0) {
    // Re-read: an edit made while this was in flight must not be dropped.
    const current = readOutbox();
    const done = new Set(operations.slice(0, sent).map((op) => op.seq));
    writeOutbox(current.filter((op) => !done.has(op.seq)));
  }

  return { sent, remaining: readOutbox().length };
}

export interface RemoteChange {
  table: OutboxTable;
  type: 'insert' | 'update' | 'delete';
  row: { id: string } & Record<string, unknown>;
}

/**
 * Folds a change from another device into the board. A row with an edit still queued here is left
 * alone, otherwise the server copy would undo something the user just did offline.
 */
export function mergeRemote(snapshot: Snapshot, change: RemoteChange): Snapshot {
  if (hasPending(change.table, change.row.id)) return snapshot;

  if (change.table === 'shared_notes') {
    if (change.type === 'delete') {
      return {
        notes: snapshot.notes.filter((note) => note.id !== change.row.id),
        items: snapshot.items.filter((item) => item.note_id !== change.row.id),
      };
    }
    const note = change.row as unknown as SharedNote;
    const notes = snapshot.notes.some((n) => n.id === note.id)
      ? snapshot.notes.map((n) => (n.id === note.id ? note : n))
      : [...snapshot.notes, note];
    return { ...snapshot, notes };
  }

  if (change.type === 'delete') {
    return { ...snapshot, items: snapshot.items.filter((item) => item.id !== change.row.id) };
  }
  const item = change.row as unknown as SharedNoteItem;
  const items = snapshot.items.some((i) => i.id === item.id)
    ? snapshot.items.map((i) => (i.id === item.id ? item : i))
    : [...snapshot.items, item];
  return { ...snapshot, items };
}

/**
 * Folds a fresh server copy into what is on the device. Rows with an edit still queued keep the
 * local version, including rows the server has never seen because they were written offline.
 */
export function mergeFetched(local: Snapshot, server: Snapshot): Snapshot {
  function keepPending<T extends { id: string }>(table: OutboxTable, localRows: T[], serverRows: T[]): T[] {
    const pending = localRows.filter((row) => hasPending(table, row.id));
    const pendingIds = new Set(pending.map((row) => row.id));
    return [...serverRows.filter((row) => !pendingIds.has(row.id)), ...pending];
  }

  return {
    notes: keepPending('shared_notes', local.notes, server.notes),
    items: keepPending('shared_note_items', local.items, server.items),
  };
}

/** Used when a note goes: its queued item edits must not outlive it and stall the outbox. */
export function dropPending(table: OutboxTable, ids: string[]): void {
  const drop = new Set(ids);
  writeOutbox(readOutbox().filter((op) => !(op.table === table && drop.has(op.row.id))));
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Older WebViews: good enough to stay unique across the two RVs until it syncs.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

/** Pinned notes first, then whatever changed most recently. */
export function sortNotes(notes: SharedNote[]): SharedNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

/** Ticked lines sink to the bottom, the way a shopping list is read. */
export function sortItems(items: SharedNoteItem[]): SharedNoteItem[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.position - b.position;
  });
}
