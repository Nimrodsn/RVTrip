'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { itinerary, days } from '@/lib/itinerary';
import { TYPE_COLORS, TYPE_EMOJI, type LocationType, type ItineraryLocation } from '@/lib/types';
import { strings } from '@/lib/strings';

const TYPE_LABELS: Record<LocationType, string> = {
  campsite: strings.map.campsite,
  attraction: strings.map.attraction,
  supply: strings.map.supply,
};

type CustomStopRow = {
  id: string;
  day: number;
  name: string;
  type: LocationType;
  lat: number;
  lng: number;
  note: string;
};

interface Props {
  customStops?: CustomStopRow[];
  editMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function MapView({ customStops = [], editMode = false, onMapClick }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<LocationType | null>(null);
  const [selected, setSelected] = useState<ItineraryLocation | null>(null);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data?.type === 'map-click' && editMode && onMapClick) {
        onMapClick(e.data.lat, e.data.lng);
      }
    },
    [editMode, onMapClick]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const filtered = itinerary.locations.filter((loc) => {
    if (filterDay !== null && loc.day !== filterDay) return false;
    if (filterType !== null && loc.type !== filterType) return false;
    return true;
  });

  const html = buildFullMapHtml(filtered, customStops, editMode);

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 p-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500">{strings.map.filterByDay}:</span>
          <button
            onClick={() => setFilterDay(null)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filterDay === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {strings.map.filterAll}
          </button>
          {days.map((d) => (
            <button
              key={d}
              onClick={() => setFilterDay(d)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                filterDay === d ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500">{strings.map.filterByType}:</span>
          <button
            onClick={() => setFilterType(null)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              filterType === null ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {strings.map.filterAll}
          </button>
          {(['campsite', 'attraction', 'supply'] as LocationType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-3 py-1 text-xs rounded-full font-medium transition-colors"
              style={{
                backgroundColor: filterType === t ? TYPE_COLORS[t].dot : TYPE_COLORS[t].bg,
                color: filterType === t ? '#fff' : TYPE_COLORS[t].text,
              }}
            >
              {TYPE_EMOJI[t]} {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2 text-center text-sm font-semibold text-green-800">
          📍 לחץ על המפה לבחירת מיקום לתחנה חדשה
        </div>
      )}

      {/* Map + Sidebar */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <div className={`flex-1 relative min-h-[300px] ${editMode ? 'ring-2 ring-green-400 ring-inset' : ''}`}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="w-full h-full border-0"
            title="Trip Map"
          />
        </div>

        <div className="w-full lg:w-80 bg-white border-r border-gray-100 overflow-auto max-h-[50vh] lg:max-h-none">
          <div className="p-4">
            <h3 className="font-bold text-primary mb-3">{strings.map.itinerary}</h3>
            <div className="space-y-2">
              {filtered.map((loc, i) => (
                <button
                  key={`${loc.day}-${i}`}
                  onClick={() => setSelected(loc)}
                  className={`w-full text-right p-3 rounded-lg border transition-colors ${
                    selected === loc
                      ? 'border-primary bg-gray-50'
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: TYPE_COLORS[loc.type].dot }}
                    >
                      {loc.day}
                    </span>
                    <span className="text-sm font-semibold text-primary truncate">{loc.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{loc.note}</p>
                  {loc.currencyAlert && (
                    <div className="mt-1 text-xs font-semibold text-orange-600">⚠️ התראת מטבע</div>
                  )}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {loc.url && (
                      <a
                        href={loc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        🌐 {strings.map.website} ↗
                      </a>
                    )}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.coords.lat},${loc.coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {strings.map.navigate} ↗
                    </a>
                    <a
                      href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${loc.coords.lat},${loc.coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {strings.map.viewEntrance} ↗
                    </a>
                  </div>
                </button>
              ))}

              {/* Custom stops in sidebar */}
              {customStops.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-lg border-2 border-dashed border-yellow-300 bg-yellow-50/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ backgroundColor: TYPE_COLORS[s.type]?.dot || '#888' }}
                    >
                      {s.day}
                    </span>
                    <span className="text-sm font-semibold text-primary truncate">{s.name}</span>
                    <span className="text-xs text-yellow-600 font-medium">({strings.map.custom})</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{s.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildFullMapHtml(
  locations: ItineraryLocation[],
  customStops: CustomStopRow[] = [],
  editMode: boolean = false,
): string {
  const markers = locations
    .map((loc) => {
      const c = TYPE_COLORS[loc.type];
      const urlLink = loc.url
        ? `<br/><a href="${loc.url}" target="_blank" style="color:#2563eb;font-size:12px">🌐 אתר ↗</a>`
        : '';
      return `L.circleMarker([${loc.coords.lat}, ${loc.coords.lng}], {
        radius: 9, fillColor: '${c.dot}', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
      }).addTo(map).bindPopup('<b>${loc.name.replace(/'/g, "\\'")}</b><br/>${loc.note.replace(/'/g, "\\'")}${urlLink}');`;
    })
    .join('\n');

  const customMarkers = customStops
    .map((s) => {
      const c = TYPE_COLORS[s.type as LocationType] || TYPE_COLORS.supply;
      return `L.circleMarker([${s.lat}, ${s.lng}], {
        radius: 9, fillColor: '${c.dot}', color: '#ff0', weight: 3, opacity: 1, fillOpacity: 0.9
      }).addTo(map).bindPopup('<b>${s.name.replace(/'/g, "\\'")}</b><br/>${s.note.replace(/'/g, "\\'")}');`;
    })
    .join('\n');

  const polyCoords = locations.map((l) => `[${l.coords.lat}, ${l.coords.lng}]`).join(',');
  const routeCoords = locations.map((l) => `${l.coords.lng},${l.coords.lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${routeCoords}?overview=full&geometries=geojson`;

  const clickHandler = editMode
    ? `
var pendingMarker=null;
map.on('click',function(e){
  if(pendingMarker){map.removeLayer(pendingMarker);}
  pendingMarker=L.marker([e.latlng.lat,e.latlng.lng],{
    icon:L.divIcon({className:'',html:'<div style="width:20px;height:20px;background:#22c55e;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',iconSize:[20,20],iconAnchor:[10,10]})
  }).addTo(map);
  parent.postMessage({type:'map-click',lat:e.latlng.lat,lng:e.latlng.lng},'*');
});
map.getContainer().style.cursor='crosshair';`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'OSM'}).addTo(map);
${markers}
${customMarkers}
var c=[${polyCoords}];
if(c.length>0){map.fitBounds(c,{padding:[40,40]});}
fetch('${osrmUrl}').then(r=>r.json()).then(data=>{
  if(data.routes&&data.routes[0]){
    var coords=data.routes[0].geometry.coordinates.map(function(c){return[c[1],c[0]]});
    L.polyline(coords,{color:'#1a1a1a',weight:3,opacity:0.6}).addTo(map);
  }
}).catch(function(){
  if(c.length>1){L.polyline(c,{color:'#1a1a1a',weight:2,opacity:0.4,dashArray:'6,5'}).addTo(map);}
});
${clickHandler}
<\/script></body></html>`;
}
