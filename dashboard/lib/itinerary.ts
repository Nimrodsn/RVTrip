import type { Itinerary } from './types';

export const itinerary: Itinerary = {
  trip_name: "Czechia-Slovakia RV Convoy 2026",
  start_date: "2026-08-21",
  rv_specs: { height: 3.2, weight: 3.5 },
  // Ordered as driven: MapView feeds this array straight into OSRM, so the order is the route.
  locations: [
    { day: 1, name: "Globus Praha Čakovice", type: "supply", coords: { lat: 50.1512616, lng: 14.5060089 }, note: "RV pickup and main stock-up. Massive RV parking.", url: "https://www.globus.cz/praha-cakovice" },
    { day: 1, name: "Kemp Dolánky", type: "campsite", coords: { lat: 50.6028618, lng: 15.1713759 }, note: "Single night in Bohemian Paradise.", url: "https://www.kempdolanky.cz/cs/" },
    { day: 2, name: "Hruboskalsko Rocks", type: "attraction", coords: { lat: 50.5525, lng: 15.1842 }, note: "Rock city, rope park, and bikes. Morning stop.", url: "https://hruboskalsko.cz/" },
    { day: 2, name: "Turnov - Lidl/Billa", type: "supply", coords: { lat: 50.585, lng: 15.155 }, note: "Quick refill before heading to the mountains.", url: "https://www.lidl.cz/" },
    { day: 2, name: "Mumlava Falls", type: "attraction", coords: { lat: 50.7706084, lng: 15.4532749 }, note: "Waterfall hike in Krkonoše NP. Easy walk, good for kids." },
    { day: 2, name: "Karavanpark Adršpach", type: "campsite", coords: { lat: 50.6195614, lng: 16.1137178 }, note: "Camping next to the rocks, ready for an early start.", url: "https://www.halaadrspach.cz/stellplatz" },
    { day: 3, name: "Adršpach-Teplice Rocks", type: "attraction", coords: { lat: 50.6102, lng: 16.1165 }, note: "Walk in before 08:30. Rock labyrinth and boat ride.", url: "https://www.adrspasskeskaly.cz/en" },
    { day: 3, name: "Resort Krásná Morava", type: "campsite", coords: { lat: 49.6084471, lng: 17.242629 }, note: "Moravian midpoint near Olomouc. Last night in Czechia before the euro.", currencyAlert: true },
    { day: 4, name: "Liptovský Mikuláš - Tesco Extra", type: "supply", coords: { lat: 49.079, lng: 19.613 }, note: "Huge parking, open 24/7. Stock up for the Liptov days.", url: "https://tesco.sk/" },
    { day: 4, name: "Mara Camping", type: "campsite", coords: { lat: 49.1107755, lng: 19.545339 }, note: "Liptov lake base. Nights 4 & 5.", url: "https://maracamping.sk/en/" },
    { day: 5, name: "Aquapark Tatralandia", type: "attraction", coords: { lat: 49.1067, lng: 19.5699 }, note: "Thermal water park day, minutes from camp.", url: "https://www.tatralandia.sk/en/welcome" },
    { day: 6, name: "Demänovská Ice Cave", type: "attraction", coords: { lat: 49.0161, lng: 19.5829 }, note: "Morning tour. Around 0°C inside, uphill walk to the entrance.", url: "https://www.ssj.sk/en/jaskyna/5-demanovska-ice-cave" },
    { day: 6, name: "Spišská Nová Ves - Kaufland", type: "supply", coords: { lat: 48.95, lng: 20.555 }, note: "Stock up before entering Slovak Paradise.", url: "https://www.kaufland.sk/" },
    { day: 6, name: "Autocamping Betlanovce", type: "campsite", coords: { lat: 48.9820995, lng: 20.3873466 }, note: "Betlanovce 130, 053 15. Base for northern Slovak Paradise." },
    { day: 7, name: "Podlesok - Suchá Belá trailhead", type: "attraction", coords: { lat: 48.9649, lng: 20.386 }, note: "One-way gorge with ladders. Start early, long drive follows.", url: "https://www.podlesok.sk/en/" },
    { day: 7, name: "Jedovnice - Albert", type: "supply", coords: { lat: 49.362, lng: 16.645 }, note: "Last refill in Moravia for the final stretch.", url: "https://www.albert.cz/" },
    { day: 7, name: "ATC Olšovec Jedovnice", type: "campsite", coords: { lat: 49.3335, lng: 16.7631 }, note: "Moravian Karst base by the lake. Final night.", url: "https://www.olsovec.cz/_en/" },
    { day: 8, name: "Punkevní Caves & Macocha", type: "attraction", coords: { lat: 49.3709677, lng: 16.7259983 }, note: "Book the earliest tour. Boat ride and Macocha abyss.", url: "https://punkevni.caves.cz/en" },
    { day: 8, name: "Globus Praha Čakovice - Return", type: "supply", coords: { lat: 50.1512616, lng: 14.5060089 }, note: "Final drop-off. RV must be back by 16:00.", url: "https://www.globus.cz/praha-cakovice" },
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

/** Trip day matching the real calendar date, or null when today falls outside the trip. */
export function getCurrentTripDay(): number | null {
  const day = getDayOffsetFromToday() + 1;
  return day >= 1 && day <= days.length ? day : null;
}

/** Whole days between the trip start and today; negative before the trip begins. */
export function getDayOffsetFromToday(): number {
  const start = new Date(itinerary.start_date);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

export function getTripDateRange(): string {
  const start = new Date(itinerary.start_date);
  const end = new Date(itinerary.start_date);
  end.setDate(end.getDate() + days.length - 1);
  return `${start.getDate()}.${start.getMonth() + 1} - ${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;
}
