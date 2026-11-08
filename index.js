const { Server } = require("ws");

// إنشاء السيرفر على المنفذ الذي توفره المنصة تلقائياً
const PORT = process.env.PORT || 3000;
const wss = new Server({ port: PORT });

console.log(`سيرفر اللعبة يعمل الآن بنجاح على المنفذ: ${PORT}`);

wss.on("connection", (ws) => {
  console.log("انضم لاعب جديد إلى السيرفر!");

  // استقبال رسائل اللاعبين وإعادة توجيهها للبقية (Relay)
  ws.on("message", (message) => {
    // إرسال البيانات لكل اللاعبين المتصلين في الغرفة
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on("close", () => {
    console.log("غادر أحد اللاعبين السيرفر.");
  });
});

