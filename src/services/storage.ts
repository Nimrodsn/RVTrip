import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const KEYS = {
  checklist: 'rv_checklist_state',
  expenses: 'rv_expenses',
  photos: 'rv_photos',
  documents: 'rv_documents',
  dayNotes: 'rv_day_notes',
  stopEdits: 'rv_stop_edits',
  hiddenStops: 'rv_hidden_stops',
  customStops: 'rv_custom_stops',
} as const;

function isSupabaseConfigured(): boolean {
  const url = supabase.supabaseUrl;
  return !!url && url !== '' && !url.includes('YOUR_PROJECT');
}

// --- Checklist ---

export async function loadChecklist(): Promise<Record<string, boolean>> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('checklist').select('*');
      if (data) {
        const map: Record<string, boolean> = {};
        for (const row of data) map[row.key] = row.checked;
        await AsyncStorage.setItem(KEYS.checklist, JSON.stringify(map));
        return map;
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.checklist);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveChecklist(state: Record<string, boolean>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.checklist, JSON.stringify(state));
  } catch {}
  if (isSupabaseConfigured()) {
    try {
      const rows = Object.entries(state).map(([key, checked]) => ({
        key,
        checked,
        updated_at: new Date().toISOString(),
      }));
      for (const row of rows) {
        await supabase
          .from('checklist')
          .upsert(row, { onConflict: 'key' });
      }
    } catch {}
  }
}

// --- Expenses ---

export interface Expense {
  id: string;
  amount: number;
  currency: 'CZK' | 'EUR';
  category: 'fuel' | 'camping' | 'food' | 'supplies' | 'activity' | 'other';
  note: string;
  day: number;
  timestamp: number;
}

export async function loadExpenses(): Promise<Expense[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('expenses').select('*').order('timestamp', { ascending: false });
      if (data) {
        await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(data));
        return data as Expense[];
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.expenses);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.expenses, JSON.stringify(expenses));
  } catch {}
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (expenses.length > 0) {
        await supabase.from('expenses').insert(expenses);
      }
    } catch {}
  }
}

// --- Photos ---

export interface PhotoEntry {
  id: string;
  uri: string;
  locationName: string;
  day: number;
  timestamp: number;
  note: string;
}

export async function loadPhotos(): Promise<PhotoEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('photos').select('*').order('timestamp', { ascending: false });
      if (data) {
        const mapped = data.map((p: Record<string, unknown>) => ({
          id: p.id,
          uri: supabase.storage.from('photos').getPublicUrl(p.storage_path as string).data.publicUrl,
          locationName: p.location_name,
          day: p.day,
          timestamp: p.timestamp,
          note: p.note,
        })) as PhotoEntry[];
        await AsyncStorage.setItem(KEYS.photos, JSON.stringify(mapped));
        return mapped;
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.photos);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePhotos(photos: PhotoEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.photos, JSON.stringify(photos));
  } catch {}
}

// --- Documents ---

export type DocCategory = 'flight' | 'insurance' | 'reservation' | 'rental' | 'id' | 'other';

export interface DocEntry {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number | null;
  category: DocCategory;
  note: string;
  timestamp: number;
}

export async function loadDocuments(): Promise<DocEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('documents').select('*').order('timestamp', { ascending: false });
      if (data) {
        const mapped = data.map((d: Record<string, unknown>) => ({
          id: d.id,
          name: d.name,
          uri: supabase.storage.from('documents').getPublicUrl(d.storage_path as string).data.publicUrl,
          mimeType: d.mime_type,
          size: d.size,
          category: d.category,
          note: d.note,
          timestamp: d.timestamp,
        })) as DocEntry[];
        await AsyncStorage.setItem(KEYS.documents, JSON.stringify(mapped));
        return mapped;
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.documents);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveDocuments(docs: DocEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.documents, JSON.stringify(docs));
  } catch {}
}

// --- Day Notes ---

export interface DayNote {
  id: string;
  day: number;
  time: string;
  text: string;
  done: boolean;
}

export async function loadDayNotes(): Promise<DayNote[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('day_notes').select('*');
      if (data) {
        await AsyncStorage.setItem(KEYS.dayNotes, JSON.stringify(data));
        return data as DayNote[];
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.dayNotes);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveDayNotes(notes: DayNote[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.dayNotes, JSON.stringify(notes));
  } catch {}
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('day_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (notes.length > 0) {
        await supabase.from('day_notes').insert(notes);
      }
    } catch {}
  }
}

// --- Stop Edits ---

export async function loadStopEdits(): Promise<Record<string, string>> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('stop_edits').select('*');
      if (data) {
        const map: Record<string, string> = {};
        for (const row of data) map[row.stop_key] = row.edited_note;
        await AsyncStorage.setItem(KEYS.stopEdits, JSON.stringify(map));
        return map;
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.stopEdits);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveStopEdits(edits: Record<string, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.stopEdits, JSON.stringify(edits));
  } catch {}
  if (isSupabaseConfigured()) {
    try {
      for (const [stopKey, editedNote] of Object.entries(edits)) {
        await supabase
          .from('stop_edits')
          .upsert({ stop_key: stopKey, edited_note: editedNote, updated_at: new Date().toISOString() }, { onConflict: 'stop_key' });
      }
    } catch {}
  }
}

// --- Hidden Stops ---

export async function loadHiddenStops(): Promise<string[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('hidden_stops').select('stop_key');
      if (data) {
        const keys = data.map((r: { stop_key: string }) => r.stop_key);
        await AsyncStorage.setItem(KEYS.hiddenStops, JSON.stringify(keys));
        return keys;
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.hiddenStops);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveHiddenStops(keys: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.hiddenStops, JSON.stringify(keys));
  } catch {}
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('hidden_stops').delete().neq('stop_key', '');
      if (keys.length > 0) {
        await supabase.from('hidden_stops').insert(keys.map((k) => ({ stop_key: k })));
      }
    } catch {}
  }
}

// --- Custom Stops ---

export interface CustomStop {
  id: string;
  day: number;
  name: string;
  type: 'campsite' | 'attraction' | 'supply';
  coords: { lat: number; lng: number };
  note: string;
}

export async function loadCustomStops(): Promise<CustomStop[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data } = await supabase.from('custom_stops').select('*');
      if (data) {
        const mapped = data.map((s: Record<string, unknown>) => ({
          id: s.id,
          day: s.day,
          name: s.name,
          type: s.type,
          coords: { lat: s.lat as number, lng: s.lng as number },
          note: s.note,
        })) as CustomStop[];
        await AsyncStorage.setItem(KEYS.customStops, JSON.stringify(mapped));
        return mapped;
      }
    } catch {}
  }
  try {
    const raw = await AsyncStorage.getItem(KEYS.customStops);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomStops(stops: CustomStop[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.customStops, JSON.stringify(stops));
  } catch {}
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('custom_stops').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (stops.length > 0) {
        const rows = stops.map((s) => ({
          id: s.id,
          day: s.day,
          name: s.name,
          type: s.type,
          lat: s.coords.lat,
          lng: s.coords.lng,
          note: s.note,
        }));
        await supabase.from('custom_stops').insert(rows);
      }
    } catch {}
  }
}
