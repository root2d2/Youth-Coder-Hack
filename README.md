# Drone Aid — Hackathon Demo

A compact Node + Socket.io demo that simulates autonomous drones for delivering essential supplies, mapping affected areas, and connecting communities with first responders.

## Features
- In-memory drone fleet simulation (positions, battery, simple autonomy).
- Submit supply requests (latitude/longitude) — system assigns nearest idle drone automatically.
- Realtime updates via Socket.io for fleet positions and requests.
- Simple web UI with Leaflet map to visualize drones and requests.

## How to run (locally)
1. Ensure Node.js (v16+) is installed.
2. Extract the zip and in project folder run:
   ```bash
   npm install
   npm start
   ```
3. Open `http://localhost:3000` in your browser.

## Notes for hackathon submission
- This is a prototype: autonomy logic is simulated server-side. For production you'd replace simulation with real telemetry, authentication, secure APIs, and adherence to aviation regulations.
- The UI is designed to be user-accessible with large controls and clear text. It's intentionally minimal for quick demos.

Good luck at the hackathon — tweak branding, map center, and add integrations (SMS, real telemetry, ML-based routing) to level up!


## Demo seeding script

Run `npm run demo` while the server is running to seed sample and emergency requests for presentation.
