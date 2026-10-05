const WebSocket = require('ws');
const PORT = process.env.PORT || 10000;
const wss = new WebSocket.Server({ port: PORT });

let usersDatabase = [];
let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    ws.id = Math.floor(Math.random() * 900000) + 100000;
    ws.send(JSON.stringify({ type: "welcome", id: ws.id }));
    console.log("-> لاعب متصل جديد، المعرف المؤقت:", ws.id);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log("استلام رسالة:", data.type);

            // 1. إنشاء حساب جديد
            if (data.type === "register") {
                const existing = usersDatabase.find(u => u.username === data.username);
                if (existing) {
                    ws.send(JSON.stringify({ type: "auth_error", message: "اسم المستخدم موجود مسبقاً!" }));
                } else {
                    const newUser = {
                        id: Math.floor(Math.random() * 900000) + 100000,
                        username: data.username,
                        password: data.password,
                        provider: "password",
                        friends: [],
                        requests: []
                    };
                    usersDatabase.push(newUser);
                    ws.id = newUser.id;
                    ws.username = newUser.username;
                    console.log(`تم إنشاء حساب بنجاح: ${newUser.username} (ID: ${newUser.id})`);
                    ws.send(JSON.stringify({
                        type: "login_ok",
                        user: { id: newUser.id, username: newUser.username, provider: "password" },
                        friends: [],
                        requests: []
                    }));
                }
            }
            // 2. تسجيل الدخول
            else if (data.type === "login") {
                const user = usersDatabase.find(u => u.username === data.username && u.password === data.password);
                if (user) {
                    ws.id = user.id;
                    ws.username = user.username;
                    console.log(`تسجيل دخول ناجح: ${user.username} (ID: ${user.id})`);
                    ws.send(JSON.stringify({
                        type: "login_ok",
                        user: { id: user.id, username: user.username, provider: user.provider },
                        friends: user.friends || [],
                        requests: user.requests || []
                    }));
                } else {
                    ws.send(JSON.stringify({ type: "auth_error", message: "خطأ في اسم المستخدم أو كلمة المرور!" }));
                }
            }
            // 3. الدخول كضيف (Guest) - تم إصلاحها هنا لترد على جودوت مباشرة
            else if (data.type === "guest") {
                const guestUser = {
                    id: Math.floor(Math.random() * 900000) + 100000,
                    username: "Guest_" + Math.floor(Math.random() * 1000),
                    provider: "guest",
                    friends: [],
                    requests: []
                };
                usersDatabase.push(guestUser);
                ws.id = guestUser.id;
                ws.username = guestUser.username;
                console.log(`دخول ضيف جديد: ${guestUser.username} (ID: ${guestUser.id})`);
                
                // الرد الفوري على جودوت لفتح اللوبي
                ws.send(JSON.stringify({
                    type: "login_ok",
                    user: { id: guestUser.id, username: guestUser.username, provider: "guest" },
                    friends: [],
                    requests: []
                }));
            }
            // 4. إضافة صديق بالـ ID
            else if (data.type === "add_friend") {
                const targetId = parseInt(data.target_id);
                const targetUser = usersDatabase.find(u => u.id === targetId);
                const currentUser = usersDatabase.find(u => u.id === ws.id);

                if (targetUser && currentUser) {
                    if (!targetUser.requests) targetUser.requests = [];
                    if (!targetUser.requests.some(r => r.id === currentUser.id)) {
                        targetUser.requests.push({ id: currentUser.id, username: currentUser.username });
                    }
                    ws.send(JSON.stringify({
                        type: "friend_sent",
                        target: { id: targetUser.id, username: targetUser.username }
                    }));

                    const targetClient = clients.find(c => c.id === targetId);
                    if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                        targetClient.send(JSON.stringify({
                            type: "friend_request",
                            from: { id: currentUser.id, username: currentUser.username }
                        }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: "friend_error", message: "لم يتم العثور على لاعب بهذا الـ ID!" }));
                }
            }
            // 5. قبول طلب الصداقة
            else if (data.type === "accept_friend") {
                const friendId = parseInt(data.friend_id);
                const currentUser = usersDatabase.find(u => u.id === ws.id);
                const friendUser = usersDatabase.find(u => u.id === friendId);

                if (currentUser && friendUser) {
                    currentUser.requests = (currentUser.requests || []).filter(r => r.id !== friendId);
                    
                    if (!currentUser.friends) currentUser.friends = [];
                    if (!currentUser.friends.some(f => f.id === friendUser.id)) {
                        currentUser.friends.push({ id: friendUser.id, username: friendUser.username });
                    }
                    if (!friendUser.friends) friendUser.friends = [];
                    if (!friendUser.friends.some(f => f.id === currentUser.id)) {
                        friendUser.friends.push({ id: currentUser.id, username: currentUser.username });
                    }

                    ws.send(JSON.stringify({
                        type: "friend_accepted",
                        friend: { id: friendUser.id, username: friendUser.username },
                        friends: currentUser.friends
                    }));

                    const friendClient = clients.find(c => c.id === friendId);
                    if (friendClient && friendClient.readyState === WebSocket.OPEN) {
                        friendClient.send(JSON.stringify({
                            type: "friends",
                            friends: friendUser.friends,
                            requests: friendUser.requests || []
                        }));
                    }
                }
            }
            // 6. طلب قائمة الأصدقاء
            else if (data.type === "get_friends") {
                const currentUser = usersDatabase.find(u => u.id === ws.id);
                if (currentUser) {
                    ws.send(JSON.stringify({
                        type: "friends",
                        friends: currentUser.friends || [],
                        requests: currentUser.requests || []
                    }));
                }
            }
            // 7. مزامنة الحركة
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
        clients = clients.filter(c => c !== ws);
        console.log("<- انقطع اتصال لاعب.");
    });
});

console.log(`السيرفر يعمل الآن على المنفذ: ${PORT}`);
