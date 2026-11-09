const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let players = {};
let nextId = 1;

app.get('/', (req, res) => {
  res.send('Server is running! Players online: ' + Object.keys(players).length);
});

wss.on('connection', (ws) => {
  const id = nextId++;
  players[id] = { x: 0, y: 0, z: 0, rot: 0 };
  console.log('Player connected: ' + id);

  ws.send(JSON.stringify({ type: 'welcome', id: id }));
  ws.send(JSON.stringify({ type: 'players', players: players }));
  broadcast(JSON.stringify({ type: 'player_joined', id: id, pos: players[id] }), ws);

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data.type === 'move') {
        players[id] = data.pos;
        broadcast(JSON.stringify({ type: 'player_move', id: id, pos: data.pos }), ws);
      }
      if (data.type === 'chat') {
        broadcast(JSON.stringify({ type: 'chat', id: id, text: data.text }));
      }
    } catch(e) { console.log('Bad message', e); }
  });

  ws.on('close', () => {
    console.log('Player left: ' + id);
    delete players[id];
    broadcast(JSON.stringify({ type: 'player_left', id: id }));
  });
});

function broadcast(msg, exclude) {
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server listening on ' + PORT));
