'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { itinerary, days, getDateForDay } from '@/lib/itinerary';
import { TYPE_COLORS, TYPE_EMOJI, type LocationType, type ItineraryLocation, type RvLocation } from '@/lib/types';
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
  rvLocations?: RvLocation[];
}

export default function MapView({ customStops = [], editMode = false, onMapClick, rvLocations = [] }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<LocationType | null>(null);
  const [selected, setSelected] = useState<ItineraryLocation | null>(null);
  const [showHeightLayer, setShowHeightLayer] = useState(true);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (e.data?.type === 'map-click' && editMode && onMapClick) {
        onMapClick(e.data.lat, e.data.lng);
      }
      if (e.data?.type === 'height-toggle') {
        setShowHeightLayer(e.data.visible);
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

  const html = buildFullMapHtml(filtered, customStops, editMode, rvLocations);

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
              {d} <span className="opacity-70">{getDateForDay(d).split(' ')[1]}</span>
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

      {/* Height restriction legend */}
      {showHeightLayer && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs">
          <span className="font-semibold text-gray-600">{strings.map.heightToggle}:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-1 rounded bg-red-600 inline-block" />
            <span className="text-red-700 font-medium">&lt;2.8{strings.map.meters} ({strings.map.heightImpassable})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-1 rounded bg-orange-500 inline-block" />
            <span className="text-orange-700 font-medium">2.8-3.3{strings.map.meters} ({strings.map.heightRisky})</span>
          </span>
          <span className="text-gray-500">
            {strings.map.rvHeight}: {itinerary.rv_specs.height}{strings.map.meters}
          </span>
        </div>
      )}

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
                      🚗 {strings.map.navigateDrive} ↗
                    </a>
                    <a
                      href={`https://mapy.com/fnc/v1/route?end=${loc.coords.lng},${loc.coords.lat}&routeType=foot_hiking&mapset=outdoor`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-green-700 hover:underline"
                    >
                      🥾 {strings.map.navigateHike} ↗
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
                  {s.lat !== 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      <a
                        href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.lat},${s.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        📷 {strings.map.viewEntrance} ↗
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        🚗 {strings.map.navigateDrive} ↗
                      </a>
                      <a
                        href={`https://mapy.com/fnc/v1/route?end=${s.lng},${s.lat}&routeType=foot_hiking&mapset=outdoor`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:underline"
                      >
                        🥾 {strings.map.navigateHike} ↗
                      </a>
                    </div>
                  )}
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
  rvLocations: RvLocation[] = [],
): string {
  const markers = locations
    .map((loc) => {
      const c = TYPE_COLORS[loc.type];
      const urlLink = loc.url
        ? `<a href="${loc.url}" target="_blank" style="color:#2563eb;font-size:12px">🌐 אתר</a> `
        : '';
      const svLink = `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${loc.coords.lat},${loc.coords.lng}" target="_blank" style="color:#2563eb;font-size:12px">📷 Street View</a> `;
      const driveLink = `<a href="https://www.google.com/maps/dir/?api=1&destination=${loc.coords.lat},${loc.coords.lng}" target="_blank" style="color:#2563eb;font-size:12px">🚗 נווט ברכב</a>`;
      const hikeLink = `<a href="https://mapy.com/fnc/v1/route?end=${loc.coords.lng},${loc.coords.lat}&routeType=foot_hiking&mapset=outdoor" target="_blank" style="color:#15803d;font-size:12px">🥾 שבילי הליכה</a>`;
      return `L.circleMarker([${loc.coords.lat}, ${loc.coords.lng}], {
        radius: 9, fillColor: '${c.dot}', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
      }).addTo(map).bindPopup('<b>${loc.name.replace(/'/g, "\\'")}</b><br/><span style="font-size:12px;color:#666">${loc.note.replace(/'/g, "\\'")}</span><br/><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${urlLink}${svLink}${driveLink}${hikeLink}</div>');`;
    })
    .join('\n');

  const customMarkers = customStops
    .map((s) => {
      const c = TYPE_COLORS[s.type as LocationType] || TYPE_COLORS.supply;
      const svLink = s.lat !== 0 ? `<a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${s.lat},${s.lng}" target="_blank" style="color:#2563eb;font-size:12px">📷 Street View</a> ` : '';
      const driveLink = s.lat !== 0 ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}" target="_blank" style="color:#2563eb;font-size:12px">🚗 נווט ברכב</a>` : '';
      const hikeLink = s.lat !== 0 ? `<a href="https://mapy.com/fnc/v1/route?end=${s.lng},${s.lat}&routeType=foot_hiking&mapset=outdoor" target="_blank" style="color:#15803d;font-size:12px">🥾 שבילי הליכה</a>` : '';
      return `L.circleMarker([${s.lat}, ${s.lng}], {
        radius: 9, fillColor: '${c.dot}', color: '#ff0', weight: 3, opacity: 1, fillOpacity: 0.9
      }).addTo(map).bindPopup('<b>${s.name.replace(/'/g, "\\'")}</b><br/><span style="font-size:12px;color:#666">${s.note.replace(/'/g, "\\'")}</span><br/><div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${svLink}${driveLink}${hikeLink}</div>');`;
    })
    .join('\n');

  const polyCoords = locations.map((l) => `[${l.coords.lat}, ${l.coords.lng}]`).join(',');
  const routeCoords = locations.map((l) => `${l.coords.lng},${l.coords.lat}`).join(';');
  const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${routeCoords}?overview=full&geometries=geojson`;

  // Compute bounding box for Overpass query (itinerary extent + padding)
  const allLats = locations.map((l) => l.coords.lat);
  const allLngs = locations.map((l) => l.coords.lng);
  const bboxPad = 0.15;
  const bbox = locations.length > 0
    ? `${Math.min(...allLats) - bboxPad},${Math.min(...allLngs) - bboxPad},${Math.max(...allLats) + bboxPad},${Math.max(...allLngs) + bboxPad}`
    : '';

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

  const rvH = itinerary.rv_specs.height;
  const heightRestrictionScript = bbox ? `
// Height restriction layer via Overpass API
var heightGroup=L.layerGroup().addTo(map);
var heightVisible=true;

var heightCtrl=L.control({position:'topright'});
heightCtrl.onAdd=function(){
  var div=L.DomUtil.create('div','');
  div.innerHTML='<button id="htBtn" style="background:#fff;border:2px solid rgba(0,0,0,0.2);border-radius:4px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:600;box-shadow:0 2px 4px rgba(0,0,0,0.15);white-space:nowrap">⚠️ הגבלות גובה</button>';
  L.DomEvent.disableClickPropagation(div);
  return div;
};
heightCtrl.addTo(map);

document.addEventListener('click',function(e){
  if(e.target&&e.target.id==='htBtn'){
    heightVisible=!heightVisible;
    if(heightVisible){map.addLayer(heightGroup);e.target.style.opacity='1';}
    else{map.removeLayer(heightGroup);e.target.style.opacity='0.5';}
    parent.postMessage({type:'height-toggle',visible:heightVisible},'*');
  }
});

var overpassQuery='[out:json][timeout:30];(way["maxheight"](${bbox});node["maxheight"](${bbox}););out body geom;';
var overpassUrl='https://overpass-api.de/api/interpreter?data='+encodeURIComponent(overpassQuery);

fetch(overpassUrl).then(function(r){return r.json()}).then(function(data){
  if(!data||!data.elements)return;
  var count=0;
  data.elements.forEach(function(el){
    var raw=el.tags&&el.tags.maxheight;
    if(!raw)return;
    var h=parseFloat(raw);
    if(isNaN(h)||h>=3.3)return;
    count++;
    var color=h<2.8?'#dc2626':'#f97316';
    var weight=h<2.8?6:5;
    var opacity=h<2.8?0.8:0.7;
    var label=h<2.8?'לא עביר':'מסוכן';
    var popup='<b>⚠️ הגבלת גובה: '+h+'מ\\x27</b><br/><span style="color:'+color+';font-weight:600">'+label+'</span><br/><span style="font-size:11px;color:#666">גובה הרכב: ${rvH}מ\\x27</span>';

    if(el.type==='way'&&el.geometry&&el.geometry.length>1){
      var coords=el.geometry.map(function(g){return[g.lat,g.lon]});
      L.polyline(coords,{color:color,weight:weight,opacity:opacity}).addTo(heightGroup).bindPopup(popup);
    }else if(el.type==='node'){
      var lat=el.lat,lng=el.lon;
      L.marker([lat,lng],{
        icon:L.divIcon({className:'',html:'<div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:14px solid '+color+';filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))"></div>',iconSize:[16,14],iconAnchor:[8,14]})
      }).addTo(heightGroup).bindPopup(popup);
    }
  });
  if(count>0){
    var badge=document.getElementById('htBtn');
    if(badge)badge.innerHTML='⚠️ הגבלות גובה ('+count+')';
  }
}).catch(function(err){
  console.warn('Height restrictions fetch failed:',err);
});
` : '';

  const rvMarkerJs = rvLocations
    .filter((rv) => rv.lat !== 0 && rv.lng !== 0)
    .map((rv) => {
      const color = rv.rv_id === 'rv1' ? '#2563eb' : '#9333ea';
      const label = rv.rv_id === 'rv1' ? 'קרוואן 1' : 'קרוואן 2';
      const ago = Math.round((Date.now() - new Date(rv.updated_at).getTime()) / 60000);
      const timeLabel = ago < 1 ? '<1 דק\\x27' : ago + ' דק\\x27';
      return `L.marker([${rv.lat},${rv.lng}],{
  icon:L.divIcon({className:'',html:'<div style="position:relative"><div class="rv-pulse" style="position:absolute;top:-8px;left:-8px;width:32px;height:32px;border-radius:50%;background:${color}33;animation:rvPulse 2s infinite"></div><div style="width:16px;height:16px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);position:relative;z-index:2"></div></div>',iconSize:[16,16],iconAnchor:[8,8]}),
  zIndexOffset:1000
}).addTo(map).bindPopup('<b style="color:${color}">${label}</b><br/><span style="font-size:11px;color:#666">${timeLabel}</span>');`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%}
@keyframes rvPulse{0%{transform:scale(1);opacity:0.7}50%{transform:scale(1.8);opacity:0}100%{transform:scale(1);opacity:0}}
</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'OSM'}).addTo(map);
${markers}
${customMarkers}
${rvMarkerJs}
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
${heightRestrictionScript}
${clickHandler}
<\/script></body></html>`;
}
