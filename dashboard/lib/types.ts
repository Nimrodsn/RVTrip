export interface Coords {
  lat: number;
  lng: number;
}

export type LocationType = 'campsite' | 'attraction' | 'supply';

export interface ItineraryLocation {
  day: number;
  name: string;
  type: LocationType;
  coords: Coords;
  note: string;
  currencyAlert?: boolean;
}

export interface RVSpecs {
  height: number;
  weight: number;
}

export interface Itinerary {
  trip_name: string;
  start_date: string;
  rv_specs: RVSpecs;
  locations: ItineraryLocation[];
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

export interface PhotoEntry {
  id: string;
  storage_path: string;
  location_name: string;
  day: number;
  timestamp: number;
  note: string;
}

export type DocCategory = 'flight' | 'insurance' | 'reservation' | 'rental' | 'passport' | 'license' | 'other';

export interface DocEntry {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number | null;
  category: DocCategory;
  note: string;
  timestamp: number;
}

export interface DayNote {
  id: string;
  day: number;
  time: string;
  text: string;
  done: boolean;
}

export interface CustomStop {
  id: string;
  day: number;
  name: string;
  type: LocationType;
  coords: Coords;
  note: string;
}

export const TYPE_COLORS: Record<LocationType, { bg: string; dot: string; text: string }> = {
  campsite: { bg: '#e8f5e9', dot: '#2e7d32', text: '#1b5e20' },
  attraction: { bg: '#ffebee', dot: '#c62828', text: '#b71c1c' },
  supply: { bg: '#e3f2fd', dot: '#1565c0', text: '#0d47a1' },
};

export const TYPE_EMOJI: Record<LocationType, string> = {
  campsite: '⛺',
  attraction: '🎯',
  supply: '🛒',
};
