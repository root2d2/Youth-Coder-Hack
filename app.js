// Frontend interaction: fetch API + Socket.io realtime updates + Leaflet map
const socket = io();

const fleetList = document.getElementById('fleetList');
const requestsList = document.getElementById('requestsList');
const form = document.getElementById('requestForm');

let map = L.map('map').setView([28.7041,77.1025], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19
}).addTo(map);

const droneMarkers = {};
const requestMarkers = {};

function updateFleet(drones){
  fleetList.innerHTML = '';
  drones.forEach(d=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${d.id}</strong> — ${d.status} — battery ${Math.round(d.battery)}%`;
    fleetList.appendChild(li);
    if (droneMarkers[d.id]){
      droneMarkers[d.id].setLatLng([d.lat,d.lng]);
    } else {
      droneMarkers[d.id] = L.marker([d.lat,d.lng], {title: d.id}).addTo(map).bindPopup(d.id);
    }
  });
}

function updateMapPoints(points){
  // show the latest points as tiny circles
  points.forEach(p=>{
    L.circle([p.lat,p.lng], {radius: 8, opacity:0.2, fillOpacity:0.1}).addTo(map);
  });
}

function updateRequests(reqs){
  requestsList.innerHTML = '';
  reqs.forEach(r=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${r.id.slice(0,6)}</strong> — ${r.status} ${r.assignedTo?('— '+r.assignedTo):''}`;
    requestsList.appendChild(li);
    if (requestMarkers[r.id]){
      requestMarkers[r.id].setLatLng([r.lat,r.lng]);
    } else {
      const m = L.circleMarker([r.lat,r.lng], {radius:8}).addTo(map).bindPopup('Req: '+r.id);
      requestMarkers[r.id] = m;
    }
    if (r.status === 'delivered') {
      requestMarkers[r.id].setStyle({color:'green'});
    }
  });
}

socket.on('fleet-update', data=>{
  if (data && data.drones) updateFleet(data.drones);
});
socket.on('map-update', data=>{
  if (data && data.points) updateMapPoints(data.points);
});
socket.on('new-request', data=>{
  // append to UI and fetch full list
  fetch('/api/requests').then(r=>r.json()).then(updateRequests);
});

fetch('/api/drones').then(r=>r.json()).then(updateFleet);
fetch('/api/requests').then(r=>r.json()).then(updateRequests);
fetch('/api/map').then(r=>r.json()).then(updateMapPoints);

form.addEventListener('submit', e=>{
  e.preventDefault();
  const name = document.getElementById('name').value;
  const phone = document.getElementById('phone').value;
  const lat = parseFloat(document.getElementById('lat').value);
  const lng = parseFloat(document.getElementById('lng').value);
  const supplies = document.getElementById('supplies').value.split(',').map(s=>s.trim()).filter(Boolean);
  if (!lat || !lng){ alert('Enter valid lat/lng'); return; }
  fetch('/api/requests', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({name,phone,lat,lng,supplies})
  }).then(r=>r.json()).then(data=>{
    alert('Request submitted: ' + data.id);
    fetch('/api/requests').then(r=>r.json()).then(updateRequests);
  }).catch(err=>{
    console.error(err); alert('Error sending request');
  });
});
