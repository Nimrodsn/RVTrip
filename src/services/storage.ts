import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function loadChecklist(): Promise<Record<string, boolean>> {
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
}

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
}

export interface PhotoEntry {
  id: string;
  uri: string;
  locationName: string;
  day: number;
  timestamp: number;
  note: string;
}

export async function loadPhotos(): Promise<PhotoEntry[]> {
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

export interface DayNote {
  id: string;
  day: number;
  time: string;
  text: string;
  done: boolean;
}

export async function loadDayNotes(): Promise<DayNote[]> {
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
}

export async function loadStopEdits(): Promise<Record<string, string>> {
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
}

export async function loadHiddenStops(): Promise<string[]> {
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
}

export interface CustomStop {
  id: string;
  day: number;
  name: string;
  type: 'campsite' | 'attraction' | 'supply';
  coords: { lat: number; lng: number };
  note: string;
}

export async function loadCustomStops(): Promise<CustomStop[]> {
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
}
