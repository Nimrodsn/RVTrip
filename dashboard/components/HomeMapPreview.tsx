'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { itinerary } from '@/lib/itinerary';
import { TYPE_COLORS } from '@/lib/types';

export default function HomeMapPreview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = buildLeafletHtml();

  return (
    <Link href="/map" className="block relative rounded-2xl overflow-hidden h-[220px] bg-gray-800">
      <iframe
        ref={iframeRef}
        srcDoc={html}
        className="w-full h-full border-0 pointer-events-none"
        title="Map Preview"
      />
      <div className="absolute bottom-0 inset-x-0 bg-black/55 py-2 text-center">
        <span className="text-white text-sm font-semibold">לחץ למפה מלאה</span>
      </div>
    </Link>
  );
}

function buildLeafletHtml(): string {
  const markers = itinerary.locations
    .map((loc) => {
      const color = TYPE_COLORS[loc.type].dot;
      return `L.circleMarker([${loc.coords.lat}, ${loc.coords.lng}], {
        radius: 7, fillColor: '${color}', color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.9
      }).addTo(map);`;
    })
    .join('\n');
  const polyCoords = itinerary.locations
    .map((l) => `[${l.coords.lat}, ${l.coords.lng}]`)
    .join(',');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>html,body,#map{margin:0;padding:0;width:100%;height:100%}
.leaflet-control-zoom,.leaflet-control-attribution{display:none!important}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
${markers}
var c=[${polyCoords}];
if(c.length>1){L.polyline(c,{color:'#1a1a1a',weight:2,opacity:0.4,dashArray:'6,5'}).addTo(map);}
if(c.length>0){map.fitBounds(c,{padding:[20,20]});}
<\/script></body></html>`;
}
