const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 10000 });

let rooms = [];
let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log("لاعب متصل جديد. عدد الغرف الحالي:", rooms.length);
    
    // إرسال قائمة الغرف فوراً عند الاتصال
    ws.send(JSON.stringify({ "rooms_list": rooms }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // إذا طلب إنشاء غرفة
            if (data.action === "create_room") {
                const newRoom = {
                    "id": rooms.length + 1,
                    "name": data.name || "غرفة جديدة"
                };
                rooms.push(newRoom);
                console.log("تم إنشاء غرفة جديدة:", newRoom.name);
                broadcast({ "rooms_list": rooms });
            } 
            else {
                // إعادة توجيه بيانات الحركة وباقي البيانات لباقي اللاعبين
                clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        } catch (e) {
            console.log("خطأ في تحليل الرسالة:", e);
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

function broadcast(data) {
    const jsonStr = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(jsonStr);
        }
    });
}

console.log("سيرفر الويب سكت يعمل بكفاءة لتحديث الغرف!");
