/*
Drone-Hackathon: simple Node + Socket.io demo server
Features:
- In-memory drone fleet simulation
- Endpoints: GET /api/drones, POST /api/requests, GET /api/map
- Socket.io realtime updates for drone positions and requests
- Serves static frontend from /public
Run: npm install && npm start
*/
const express = require('express');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

/* In-memory data */
const drones = {};
const requests = {};
const mapPoints = []; // simple scanned points

// Initialize a few drones
for (let i=1;i<=4;i++){
  drones['drone-'+i] = {
    id: 'drone-'+i,
    status: 'idle',
    lat: 28.7041 + (Math.random()-0.5)*0.05, // around New Delhi for demo
    lng: 77.1025 + (Math.random()-0.5)*0.05,
    battery: 80 + Math.floor(Math.random()*20),
    target: null
  };
}

/* Utility: move drone toward target a bit */
function stepTowards(drone, target, step=0.0008){
  const dx = target.lng - drone.lng;
  const dy = target.lat - drone.lat;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < step) {
    drone.lat = target.lat;
    drone.lng = target.lng;
    return true;
  }
  drone.lat += (dy / dist) * step;
  drone.lng += (dx / dist) * step;
  return false;
}

/* Background simulation loop */
setInterval(()=>{
  // Simulate scanning / mapping: append a map point near each drone
  Object.values(drones).forEach(d=>{
    // occasional battery drain
    d.battery = Math.max(5, d.battery - 0.02);
    mapPoints.push({lat: d.lat + (Math.random()-0.5)*0.0005, lng: d.lng + (Math.random()-0.5)*0.0005, t: Date.now()});
    if (mapPoints.length>1000) mapPoints.shift();
    // If assigned a target, move toward it
    if (d.target){
      const arrived = stepTowards(d, d.target);
      d.status = 'enroute';
      if (arrived){
        // mark request as completed
        const req = requests[d.target.requestId];
        if (req) {
          req.status = 'delivered';
          req.deliveredBy = d.id;
          req.deliveredAt = Date.now();
        }
        d.target = null;
        d.status = 'returning';
      }
    } else {
      // if idle, slowly wander
      d.lat += (Math.random()-0.5)*0.0002;
      d.lng += (Math.random()-0.5)*0.0002;
      d.status = 'idle';
    }
  });
  // broadcast updates
  io.emit('fleet-update', { drones: Object.values(drones) });
  io.emit('map-update', { points: mapPoints.slice(-200) });
}, 1000);

/* API endpoints */

// Get fleet
app.get('/api/drones', (req, res)=>{
  res.json(Object.values(drones));
});

// Get recent map points
app.get('/api/map', (req,res)=>{
  res.json(mapPoints.slice(-500));
});

// Get requests
app.get('/api/requests', (req,res)=>{
  res.json(Object.values(requests));
});

// Submit a supply request - the app assigns the nearest available drone if any
app.post('/api/requests', (req,res)=>{
  const {name, phone, lat, lng, supplies} = req.body;
  if (!lat || !lng) return res.status(400).json({error:'lat,lng required'});
  const id = uuidv4();
  const reqObj = { id, name: name||'Anonymous', phone: phone||'', lat, lng, supplies: supplies||[], status:'pending', createdAt: Date.now() };
  requests[id] = reqObj;

  // Find nearest idle drone
  let best = null;
  let bestDist = Infinity;
  Object.values(drones).forEach(d=>{
    if (d.status === 'idle' && !d.target && d.battery>20){
      const dist = Math.hypot(d.lat - lat, d.lng - lng);
      if (dist < bestDist){
        bestDist = dist; best = d;
      }
    }
  });
  if (best){
    best.target = { lat, lng, requestId: id };
    best.status = 'assigned';
    reqObj.status = 'assigned';
    reqObj.assignedTo = best.id;
  } else {
    reqObj.status = 'queued';
  }

  io.emit('new-request', reqObj);
  io.emit('fleet-update', { drones: Object.values(drones) });
  res.json(reqObj);
});

// Simple admin endpoint to command a drone to return or go to a point
app.post('/api/drones/:id/command', (req,res)=>{
  const id = req.params.id;
  const cmd = req.body;
  const d = drones[id];
  if (!d) return res.status(404).json({error:'no such drone'});
  if (cmd.type === 'return'){
    d.target = null;
    d.status = 'returning';
  } else if (cmd.type === 'goto' && cmd.lat && cmd.lng){
    d.target = {lat: cmd.lat, lng: cmd.lng};
    d.status = 'enroute';
  }
  io.emit('fleet-update', { drones: Object.values(drones) });
  res.json(d);
});

/* Socket.io */
io.on('connection', (socket)=>{
  console.log('socket connected', socket.id);
  socket.emit('fleet-update', { drones: Object.values(drones) });
  socket.emit('map-update', { points: mapPoints.slice(-200) });
  socket.emit('requests', Object.values(requests));
});

/* Fallback to index.html for SPA */
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

/* Start server */
const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log('Server running on port', PORT));
