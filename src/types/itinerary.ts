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
