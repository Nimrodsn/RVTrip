# RV-Twin Commander

React Native (Expo) app for convoy management: two Category B RVs in Czechia & Slovakia 2026.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `MAPS_API_KEY` (Google Cloud: Maps SDK, Places API, Directions API).
3. Start: `npm start`

## Features

- **Home dashboard** (Hebrew, RTL): Trip summary, next stop, Map / Meltdown / Pre-flight / Commander.
- **Map**: Itinerary markers (campsites vs attractions), Street View button per location.
- **Emergency Meltdown**: One-tap find closest playground, ice cream, or lake within 15 km (Places API).
- **RVProfile**: Global config height 3.2 m, width 2.5 m, weight 3.5 t.
- **Safety checklist** and **Commander** (AI) screens (placeholders for full implementation).

## RTL

The app forces RTL for Hebrew. Restart the app after first load for layout direction to apply.
