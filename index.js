const http = require('http');

// قاعدة بيانات وهمية للاعبين (يمكنك تحديثها أو ربطها بقاعدة بيانات حقيقية لاحقاً)
let usersDatabase = [
    { id: 1, username: "Player1", balance: 0 },
    { id: 2, username: "MourGaming", balance: 500 }
];

// قاعدة بيانات الأكواد المتوفرة للشحن
let codesDatabase = [
    { id: 1, item: "شحن 60 شدة PUBG", code: "PUBG-60-XYZ123", is_used: false },
    { id: 2, item: "شحن 60 شدة PUBG", code: "PUBG-60-ABC789", is_used: false },
    { id: 3, item: "شحن 325 شدة PUBG", code: "PUBG-325-LMN456", is_used: false },
    { id: 4, item: "بطاقة جوجل بلاي 10$", code: "GOOGLE-10-GIFT99", is_used: false }
];

const server = http.createServer((req, res) => {
    // إعدادات الـ Headers لضمان توافق الاتصال مع تطبيق غودو
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // مسار استقبال طلب الشحن من تطبيق غودو الخارجي
    if (req.method === 'POST' && req.url === '/buy') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const playerId = data.player_id;
                const requestedItem = data.item;

                // 1. التحقق من وجود اللاعب عبر الـ ID
                let player = usersDatabase.find(u => u.id == playerId);
                if (!player) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        message: "معرف اللاعب (ID) غير مسجل في النظام." 
                    }));
                    return;
                }

                // 2. البحث عن كود صالح وغير مستخدم للفئة المطلوبة
                let foundCode = codesDatabase.find(c => c.item === requestedItem && !c.is_used);

                if (foundCode) {
                    // جعل الكود مستخدماً لكي لا يتكرر بيعه لشخص آخر
                    foundCode.is_used = true;
                    
                    // زيادة رصيد اللاعب أو تسجيل العملية
                    player.balance += 60; 

                    console.log(`تم الشحن بنجاح للـ ID: ${playerId} - العنصر: ${requestedItem}`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        code: foundCode.code,
                        message: "تم تسليم الكود بنجاح!"
                    }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: false,
                        message: "عذراً، نفدت الأكواد لهذه الفئة حالياً."
                    }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    message: "بيانات الطلب غير صالحة." 
                }));
            }
        });
    } else {
        // صفحة ترحيبية بسيطة عند فتح رابط السيرفر من المتصفح
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end("مرحباً بك، سيرفر متجر الأكواد يعمل بنجاح!");
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على البورت ${PORT}`);
});
