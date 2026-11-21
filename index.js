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
let users = {};
let friends = {};
let friendRequests = {};
let nextId = 1;

function send(ws, obj){ if(ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); }
function broadcast(msg, except){
  const str = JSON.stringify(msg);
  wss.clients.forEach((c) => { if (c !== except && c.readyState === WebSocket.OPEN) c.send(str); });
}
function getFriendsList(userId){
  return (friends[userId]||[]).map(fid => {
    let p = players[fid];
    let u = Object.values(users).find(x=>x.id===fid);
    return { id: fid, username: p ? p.username : (u ? u.username : "لاعب"), online: !!p };
  });
}
function getRequestsList(userId){
  return (friendRequests[userId]||[]).map(fid => {
    let p = players[fid];
    let u = Object.values(users).find(x=>x.id===fid);
    return { id: fid, username: p ? p.username : (u ? u.username : "لاعب") };
  });
}

wss.on('connection', (ws) => {
  const id = nextId++;
  ws.userId = null;
  players[id] = { id: id, username: "Guest_"+id, x: 0, y: 1, z: 0, rot_y: 0, anim: 'idle', speed: 0 };
  send(ws, { type: 'welcome', id: id });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'guest') {
        ws.userId = id;
        players[id].username = "Guest_"+id;
        if(!friends[id]) friends[id]=[];
        send(ws, { type: 'login_ok', user: { id: id, username: players[id].username, provider: 'guest' }, friends: [] });
      }

      if (msg.type === 'register') {
        if (!msg.username || !msg.password) { send(ws, { type: 'auth_error', message: 'اكتب اسم وكلمة مرور' }); return; }
        if (users[msg.username]) { send(ws, { type: 'auth_error', message: 'الاسم هذا مسجل قبل، جرب اسم ثاني' }); return; }
        users[msg.username] = { id: id, username: msg.username, password: msg.password, provider: 'password' };
        ws.userId = id;
        players[id].username = msg.username;
        if(!friends[id]) friends[id]=[];
        send(ws, { type: 'login_ok', user: { id: id, username: msg.username, provider: 'password' }, friends: [] });
      }

      if (msg.type === 'login') {
        let u = users[msg.username];
        if (!u || u.password !== msg.password) { send(ws, { type: 'auth_error', message: 'اسم المستخدم أو كلمة المرور غلط' }); return; }
        let oldId = u.id;
        if (players[oldId] && oldId !== id) delete players[oldId];
        u.id = id;
        ws.userId = id;
        players[id].username = msg.username;
        if(!friends[id]) friends[id]=[];
        if (friends[oldId] && oldId !== id) { friends[id] = friends[oldId]; delete friends[oldId]; }
        send(ws, { type: 'login_ok', user: { id: id, username: msg.username, provider: 'password' }, friends: getFriendsList(id) });
      }

      if (msg.type === 'get_friends') {
        send(ws, { type: 'friends', friends: getFriendsList(ws.userId||id), requests: getRequestsList(ws.userId||id) });
      }

      if (msg.type === 'add_friend') {
        let targetId = parseInt(msg.target_id);
        let myId = ws.userId||id;
        if(!friendRequests[targetId]) friendRequests[targetId]=[];
        if(!friendRequests[targetId].includes(myId)) friendRequests[targetId].push(myId);
        wss.clients.forEach(c=>{
          if((c.userId===targetId)){
            send(c, { type: 'friend_request', from: { id: myId, username: players[myId]?.username || "لاعب" } });
          }
        });
        send(ws, { type: 'friend_sent', target: { id: targetId, username: players[targetId]?.username || "صديق" } });
      }

      if (msg.type === 'accept_friend') {
        let myId = ws.userId||id;
        let fid = parseInt(msg.friend_id);
        if(!friends[myId]) friends[myId]=[];
        if(!friends[fid]) friends[fid]=[];
        if(!friends[myId].includes(fid)) friends[myId].push(fid);
        if(!friends[fid].includes(myId)) friends[fid].push(myId);
        if(friendRequests[myId]) friendRequests[myId] = friendRequests[myId].filter(x=>x!==fid);
        send(ws, { type: 'friend_accepted', friend: { id: fid, username: players[fid]?.username || "صديق" }, friends: getFriendsList(myId) });
      }

      if (msg.type === 'move') {
        players[id].x = msg.x; players[id].y = msg.y; players[id].z = msg.z;
        players[id].rot_y = msg.r ?? msg.rot_y ?? 0;
        players[id].anim = msg.anim || 'idle';
        players[id].speed = msg.speed || 0;
        wss.clients.forEach(c=>{
          if(c.readyState===WebSocket.OPEN){
            send(c, { type: 'state', players: Object.values(players).map(p=>({ id: p.id, name: p.username, x: p.x, y: p.y, z: p.z, r: p.rot_y })) });
          }
        });
      }

      if (msg.type === 'ping') send(ws, { type: 'pong' });
      if (msg.type === 'chat') broadcast({ type: 'chat', from: id, text: msg.text });

    } catch (e) { console.log("msg error", e); }
  });

  ws.on('close', () => {
    delete players[id];
    broadcast({ type: 'player_left', id: id });
  });
});

setInterval(() => { console.log('Keep-alive Players:', Object.keys(players).length); }, 10*60*1000);
server.listen(PORT, () => { console.log('✅ Server on', PORT); });
