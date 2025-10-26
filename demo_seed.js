/*
demo_seed.js
Simple script to seed the server with realistic requests and simulate an emergency spike.
Usage: node demo_seed.js
Ensure the server is running at http://localhost:3000
*/
const axios = require('axios');

const SERVER = process.env.SERVER || 'http://localhost:3000';

function wait(ms){ return new Promise(res=>setTimeout(res, ms)); }

async function sendRequest(name, lat, lng, supplies, phone){
  try{
    const res = await axios.post(`${SERVER}/api/requests`, {
      name, phone, lat, lng, supplies
    }, {timeout:5000});
    console.log('Sent', res.data.id, res.data.status, res.data.assignedTo || '');
  } catch (e){
    console.error('Error sending', name, e.message);
  }
}

async function main(){
  console.log('Seeding demo requests to', SERVER);
  // Normal community requests spread out
  await sendRequest('Community Health Post', 28.7041, 77.1025, ['bandages','water'], '+91123456');
  await wait(600);
  await sendRequest('Elder Home', 28.71, 77.11, ['meds','water'], '+91123457');
  await wait(600);
  await sendRequest('School', 28.695, 77.09, ['food packs','blankets'], '+91123458');
  await wait(600);

  // Simulate an emergency spike: 6 simultaneous nearby requests
  console.log('--- emergency spike ---');
  const spikeCenter = {lat:28.706, lng:77.103};
  const promises = [];
  for (let i=1;i<=6;i++){
    const lat = spikeCenter.lat + (Math.random()-0.5)*0.006;
    const lng = spikeCenter.lng + (Math.random()-0.5)*0.006;
    promises.push(sendRequest('House '+i, lat, lng, ['water','first-aid'], '+91'+(900000000+i)));
  }
  await Promise.all(promises);
  console.log('Seeding complete. Check the web UI at http://localhost:3000');
}

main();
