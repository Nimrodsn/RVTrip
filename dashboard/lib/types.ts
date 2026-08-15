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
  url?: string;
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

/** Visual mood of a day, used to pick the header gradient when there is no photo. */
export type DayTheme = 'rock' | 'water' | 'cave' | 'forest' | 'city' | 'road';

/**
 * Hebrew narrative for one trip day. Written by hand rather than derived from `locations`,
 * because where you sleep carries over between days and the last day has no overnight at all.
 */
export interface DayGuide {
  day: number;
  title: string;
  icon: string;
  theme: DayTheme;
  drive?: string;
  doing: string[];
  /** Free text, since days 2 and 5 stay put and day 8 ends the trip. */
  sleeping: string;
  knowBefore: string[];
  image?: { src: string; alt: string; credit?: string };
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

export type DocCategory = 'flight' | 'insurance' | 'reservation' | 'rental' | 'passport' | 'license' | 'ticket' | 'other';

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

export interface RvLocation {
  rv_id: 'rv1' | 'rv2';
  lat: number;
  lng: number;
  updated_at: string;
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
