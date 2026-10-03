const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  console.log('انضم لاعب جديد بنجاح!');

  ws.on('message', (message) => {
    // إعادة إرسال البيانات لباقي اللاعبين (Broadcast)
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('غادر أحد اللاعبين.');
  });
});

console.log(`سيرفر الألعاب يعمل بنجاح على المنفذ ${PORT}`);

