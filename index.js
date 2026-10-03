const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: process.env.PORT || 10000 });

// تخزين الحسابات المسجلة واللاعبين المتصلين
let usersDatabase = []; // سيحفظ الحسابات الحقيقية (اسم المستخدم، كلمة المرور، الـ ID)
let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log("تم اتصال لاعب جديد بالسيرفر الحقيقي.");

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // 1. طلب إنشاء حساب جديد (Sign Up)
            if (data.type === "register") {
                const existingUser = usersDatabase.find(u => u.username === data.username);
                if (existingUser) {
                    ws.send(JSON.stringify({ type: "register_response", success: false, message: "اسم المستخدم مستخدم مسبقاً!" }));
                } else {
                    const newUser = {
                        id: Math.floor(Math.random() * 900000) + 100000, // ID حقيقي من 6 أرقام
                        username: data.username,
                        password: data.password,
                        auth: data.auth || "Guest"
                    };
                    usersDatabase.push(newUser);
                    ws.send(JSON.stringify({ 
                        type: "register_response", 
                        success: true, 
                        id: newUser.id, 
                        username: newUser.username,
                        message: "تم إنشاء الحساب بنجاح!" 
                    }));
                    console.log(`تم تسجيل حساب جديد: ${newUser.username} بمعرف ID: ${newUser.id}`);
                }
            }
            // 2. طلب تسجيل الدخول بحساب حقيقي (Login)
            else if (data.type === "login") {
                const user = usersDatabase.find(u => u.username === data.username && u.password === data.password);
                if (user) {
                    ws.id = user.id; // ربط اتصال الـ WebSocket بمعرف اللاعب الحقيقي
                    ws.username = user.username;
                    ws.send(JSON.stringify({ 
                        type: "login_response", 
                        success: true, 
                        id: user.id, 
                        username: user.username,
                        message: "تم تسجيل الدخول بنجاح!" 
                    }));
                    console.log(`تسجيل دخول ناجح للاعب: ${user.username} (ID: ${user.id})`);
                } else {
                    ws.send(JSON.stringify({ type: "login_response", success: false, message: "خطأ في اسم المستخدم أو كلمة المرور!" }));
                }
            }
            // 3. مزامنة الحركة واللعب الجماعي
            else if (data.type === "move") {
                clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(message);
                    }
                });
            }
        } catch (e) {
            console.log("خطأ في معالجة البيانات:", e);
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
    });
});

console.log("سيرفر الحسابات الحقيقية يعمل بكفاءة تامة!");

