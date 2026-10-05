const http = require('http');

const ADMIN_TOKEN = "CHANGE-ME-ADMIN"; // يجب أن يتطابق مع الكود في غودو

// قاعدة بيانات المنتجات
let productsDatabase = [
    { id: "p1", name: "شحن 60 شدة PUBG", price: 0.99, currency: "USD", enabled: true },
    { id: "p2", name: "شحن 325 شدة PUBG", price: 4.99, currency: "USD", enabled: true }
];

// قاعدة بيانات الأكواد
let codesDatabase = [
    { id: 1, productId: "p1", code: "PUBG-60-XYZ123", is_used: false },
    { id: 2, productId: "p2", code: "PUBG-325-LMN456", is_used: false }
];

// قاعدة بيانات اللاعبين (أو الأرصدة)
let usersDatabase = [
    { id: "1001", balance: 0 }
];

const server = http.createServer((req, res) => {
    // تفعيل الـ CORS لضمان قبول الاتصال من غودو
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const urlParts = req.url.split('?')[0].split('/');
    // مثال للروابط: ['', 'admin', 'products', 'p1'] الخ

    // 1. جلب المنتجات المتاحة للعملاء (GET /products)
    if (req.method === 'GET' && req.url === '/products') {
        const activeProducts = productsDatabase.filter(p => p.enabled);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ products: activeProducts }));
        return;
    }

    // 2. طلب شراء / إنشاء طلب (POST /orders)
    if (req.method === 'POST' && req.url === '/orders') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const playerId = data.playerId;
                const productId = data.productId;

                let product = productsDatabase.find(p => p.id === productId && p.enabled);
                if (!product) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: "المنتج غير متوفر" }));
                    return;
                }

                // البحث عن كود غير مستخدم لهذا المنتج وإعطاؤه للمشترى
                let foundCode = codesDatabase.find(c => c.productId === productId && !c.is_used);
                if (!foundCode) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: "عذراً، نفدت الأكواد لهذا المنتج حالياً." }));
                    return;
                }

                foundCode.is_used = true;
                console.log(`تم بيع كود للاعب ID: ${playerId} - المنتج: ${product.name}`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    code: foundCode.code, 
                    message: "تم الشحن بنجاح! كودك هو: " + foundCode.code 
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: "خطأ في بيانات الطلب" }));
            }
        });
        return;
    }

    // 3. استرداد كود (POST /redeem)
    if (req.method === 'POST' && req.url === '/redeem') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const codeStr = data.code;

                let codeItem = codesDatabase.find(c => c.code === codeStr);
                if (!codeItem) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: "الكود غير صحيح." }));
                    return;
                }

                if (codeItem.is_used) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: "هذا الكود مستخدم مسبقاً!" }));
                    return;
                }

                codeItem.is_used = true;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: "تم تفعيل الكود بنجاح!" }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: "خطأ في المعالجة" }));
            }
        });
        return;
    }

    // التحقق من صلاحيات المشرف (Admin Auth) للطلبات القادمة
    const adminToken = req.headers['x-admin-token'];
    if (url[1] === 'admin' && adminToken !== ADMIN_TOKEN) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: "غير مرخص - خطأ في رمز المشرف" }));
        return;
    }

    // 4. لوحة التحكم - جلب كل المنتجات للمشرف (GET /admin/products)
    if (req.method === 'GET' && req.url === '/admin/products') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ products: productsDatabase }));
        return;
    }

    // 5. لوحة التحكم - إضافة أو تعديل منتج (POST/PUT /admin/products...)
    if ((req.method === 'POST' || req.method === 'PUT') && req.url.startsWith('/admin/products')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                let index = productsDatabase.findIndex(p => p.id === data.id);
                
                if (index >= 0) {
                    productsDatabase[index] = data; // تحديث
                } else {
                    productsDatabase.push(data); // إضافة جديد
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false }));
            }
        });
        return;
    }

    // 6. لوحة التحكم - حذف منتج (DELETE /admin/products/:id)
    if (req.method === 'DELETE' && req.url.startsWith('/admin/products/')) {
        const productId = req.url.split('/')[3];
        productsDatabase = productsDatabase.filter(p => p.id !== productId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // 7. لوحة التحكم - إضافة أكواد جديدة بالجملة (POST /admin/codes)
    if (req.method === 'POST' && req.url === '/admin/codes') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const productId = data.productId;
                const lines = data.codes; // مصفوفة الأكواد المكتوبة أسطر

                let addedCount = 0;
                for (let codeText of lines) {
                    if (codeText.trim() !== '') {
                        codesDatabase.push({
                            id: codesDatabase.length + 1,
                            productId: productId,
                            code: codeText.trim(),
                            is_used: false
                        });
                        addedCount++;
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, added: addedCount }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, added: 0 }));
            }
        });
        return;
    }

    // صفحة افتراضية للتأكد من عمل السيرفر
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end("سيرفر متجر الأكواد يعمل بكفاءة مع غودو!");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر يعمل الآن على البورت ${PORT}`);
});

