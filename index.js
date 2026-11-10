const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => { res.send('🎮 Game Server Running! Players: ' + Object.keys(players).length); });
app.get('/ping', (req, res) => { res.send('alive ✅'); });
app.get('/health', (req, res) => { res.json({ status: 'online', players: Object.keys(players).length }); });

let players = {};
let nextId = 1;

wss.on('connection', (ws) => {
  const id = nextId++;
  players[id] = { id: id, x: 0, y: 1, z: 0, rot_y: 0, anim: 'idle', speed: 0 };
  ws.send(JSON.stringify({ type: 'welcome', yourId: id, players: players }));
  broadcast({ type: 'player_joined', player: players[id] }, ws);
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'move') {
        players[id].x = msg.x; players[id].y = msg.y; players[id].z = msg.z;
        players[id].rot_y = msg.rot_y || 0;
        players[id].anim = msg.anim || 'idle';
        players[id].speed = msg.speed || 0;
        broadcast({ type: 'player_moved', player: players[id] }, ws);
      }
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
      if (msg.type === 'chat') broadcast({ type: 'chat', from: id, text: msg.text });
    } catch (e) {}
  });
  ws.on('close', () => {
    delete players[id];
    broadcast({ type: 'player_left', id: id });
  });
});
function broadcast(msg, except) {
  const str = JSON.stringify(msg);
  wss.clients.forEach((c) => { if (c !== except && c.readyState === WebSocket.OPEN) c.send(str); });
}
setInterval(() => { console.log('Keep-alive Players:', Object.keys(players).length); }, 10*60*1000);
server.listen(PORT, () => { console.log('✅ Server on', PORT); });
