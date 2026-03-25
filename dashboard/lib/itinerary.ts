import type { Itinerary } from './types';

export const itinerary: Itinerary = {
  trip_name: "Czechia-Slovakia RV Convoy 2026",
  start_date: "2026-08-21",
  rv_specs: { height: 3.2, weight: 3.5 },
  locations: [
    { day: 1, name: "Globus Praha Čakovice", type: "supply", coords: { lat: 50.1512, lng: 14.506 }, note: "Main stock-up. Massive RV parking.", url: "https://www.globus.cz/praha-cakovice" },
    { day: 1, name: "Kemp Dolánky", type: "campsite", coords: { lat: 50.6028, lng: 15.1713 }, note: "Night 1 & 2 base.", url: "https://www.kempdolanky.cz/cs/" },
    { day: 2, name: "Turnov - Lidl/Billa", type: "supply", coords: { lat: 50.585, lng: 15.155 }, note: "Quick refill near the campsite.", url: "https://www.lidl.cz/" },
    { day: 2, name: "Hruboskalsko Rocks", type: "attraction", coords: { lat: 50.5525, lng: 15.1842 }, note: "Rock city, rope park, and bikes.", url: "https://hruboskalsko.cz/" },
    { day: 3, name: "Adršpach-Teplice Rocks", type: "attraction", coords: { lat: 50.6102, lng: 16.1165 }, note: "Arrive before 08:30. Rock labyrinth and boat ride.", url: "https://www.adrspasskeskaly.cz/en" },
    { day: 3, name: "Trutnov - Kaufland", type: "supply", coords: { lat: 50.562, lng: 15.912 }, note: "Strategic stop: Last major CZ shop before Slovakia (EUR transition).", url: "https://www.kaufland.cz/", currencyAlert: true },
    { day: 3, name: "Karavanpark Adršpach", type: "campsite", coords: { lat: 50.6195, lng: 16.1137 }, note: "Camping near the rocks.", url: "https://www.halaadrspach.cz/stellplatz" },
    { day: 4, name: "Liptovský Mikuláš - Tesco Extra", type: "supply", coords: { lat: 49.079, lng: 19.613 }, note: "Huge parking, open 24/7. Stock up for Liptov days.", url: "https://tesco.sk/" },
    { day: 4, name: "Aquapark Tatralandia", type: "attraction", coords: { lat: 49.1067, lng: 19.5699 }, note: "Water park day in Slovakia.", url: "https://www.tatralandia.sk/en/welcome" },
    { day: 4, name: "Mara Camping", type: "campsite", coords: { lat: 49.1107, lng: 19.5453 }, note: "Night 4 & 5 base.", url: "https://maracamping.sk/en/" },
    { day: 5, name: "Demänovská Ice Cave", type: "attraction", coords: { lat: 49.0161, lng: 19.5829 }, note: "Ice cave visit + family rafting nearby.", url: "https://www.ssj.sk/en/jaskyna/5-demanovska-ice-cave" },
    { day: 6, name: "Treetop Walk Bachledka", type: "attraction", coords: { lat: 49.286, lng: 20.3141 }, note: "Walking above trees + giant slide.", url: "https://chodnikkorunamistromov.sk/en/" },
    { day: 6, name: "Spišská Nová Ves - Kaufland", type: "supply", coords: { lat: 48.95, lng: 20.555 }, note: "Stock up before entering Slovak Paradise/Podlesok.", url: "https://www.kaufland.sk/" },
    { day: 6, name: "Podlesok", type: "campsite", coords: { lat: 48.9649, lng: 20.386 }, note: "Gateway to Slovak Paradise.", url: "https://www.podlesok.sk/en/" },
    { day: 7, name: "Jedovnice - Albert", type: "supply", coords: { lat: 49.362, lng: 16.645 }, note: "Last refill in Moravia for the final stretch.", url: "https://www.albert.cz/" },
    { day: 7, name: "ATC Olšovec Jedovnice", type: "campsite", coords: { lat: 49.3335, lng: 16.7631 }, note: "Moravian Karst base near the lake.", url: "https://www.olsovec.cz/_en/" },
    { day: 8, name: "Punkevní Caves & Macocha", type: "attraction", coords: { lat: 49.3709, lng: 16.7259 }, note: "Cave tour. Return RV by 16:00.", url: "https://punkevni.caves.cz/en" },
  ],
};

export const days = Array.from(new Set(itinerary.locations.map((l) => l.day))).sort((a, b) => a - b);

export function getDateForDay(day: number): string {
  const base = new Date(itinerary.start_date);
  base.setDate(base.getDate() + day - 1);
  const dd = base.getDate();
  const mm = base.getMonth() + 1;
  const weekday = base.toLocaleDateString('he-IL', { weekday: 'short' });
  return `${weekday} ${dd}.${mm}`;
}

export function getTripDateRange(): string {
  const start = new Date(itinerary.start_date);
  const end = new Date(itinerary.start_date);
  end.setDate(end.getDate() + days.length - 1);
  return `${start.getDate()}.${start.getMonth() + 1} - ${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;
}
