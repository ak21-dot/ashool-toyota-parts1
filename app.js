// =============================================
// نظام طيب علي الأشول – قطع غيار تويوتا
// V5.3 - مبيعات حرة، تحكم كامل، PDF احترافي
// =============================================
const PASS = { manager: '2005', employee: '0000' };
let user = null;

// أدوات
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2,6); }
function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0,10); }
function fmt(n) { return Number(n).toLocaleString('ar') + ' ر.ي'; }
function fdate(iso) {
    try { return new Date(iso).toLocaleDateString('ar', { year:'numeric', month:'short', day:'numeric' }); }
    catch(e) { return iso; }
}
function monthStart() { let d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); }

// قاعدة بيانات
function DB() {
    let raw = localStorage.getItem('ashool_free');
    if (raw) return JSON.parse(raw);
    return {
        products: [
            { id:'p1', name:'فلتر زيت أصلي', code:'90915-YZZD2', qty:20, sellPrice:3500 },
            { id:'p2', name:'زيت محرك 10W40', code:'10W40-4L', qty:15, sellPrice:8500 },
            { id:'p3', name:'طقم كفرات أمامي', code:'TYR-F185', qty:8, sellPrice:45000 }
        ],
        sales: [],
        debts_given: [],
        debts_taken: [],
        consign: [],
        workers: [],
        worker_draws: [],
        expenses: [],
        settings: {}
    };
}
function save(db) { localStorage.setItem('ashool_free', JSON.stringify(db)); }

function toast(msg) {
    let t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

// ========== الدخول ==========
function renderLogin() {
    document.getElementById('userBadge').textContent = '';
    document.getElementById('app').innerHTML = `
        <div class="card" style="text-align:center; margin-top:40px;">
            <h2>🔐 تسجيل الدخول</h2>
            <p class="text-sm mb">طيب علي الأشول – قطع غيار تويوتا</p>
            <select id="role" class="mb">
                <option value="manager">👑 مدير</option>
                <option value="employee">🧑‍💼 موظف</option>
            </select>
            <input type="password" id="pass" placeholder="كلمة المرور">
            <button class="btn btn-gold mt" onclick="login()">دخول</button>
            <p id="err" class="text-red text-sm mt"></p>
        </div>`;
}
function login() {
    let r = document.getElementById('role').value;
    let p = document.getElementById('pass').value;
    if (p === PASS[r]) {
        user = { role: r, name: r === 'manager' ? 'المدير' : 'الموظف' };
        document.getElementById('userBadge').textContent = user.name;
        dashboard();
    } else {
        document.getElementById('err').textContent = '❌ كلمة المرور غير صحيحة';
    }
}
function logout() { user = null; renderLogin(); }

// القائمة
function nav() {
    let pages = user.role === 'manager'
        ? ['dashboard','sales','debts_given','debts_taken','consign','workers','products','expenses','reports','sync']
        : ['dashboard','sales','debts_given','debts_taken','consign','workers','sync'];
    let labels = {
        dashboard:'🏠', sales:'🛒 بيع', debts_given:'📋 ديون لنا', debts_taken:'📋 علينا',
        consign:'🔩 عهد', workers:'👷 عمال', products:'📦 مخزون', expenses:'💸 مصروفات',
        reports:'📑 تقارير', sync:'🔄 مزامنة'
    };
    return `<div class="nav">${pages.map(p => `<button class="btn btn-outline btn-sm" onclick="${p}()">${labels[p]}</button>`).join('')}</div>`;
}

// لوحة التحكم
function dashboard() {
    let db = DB(), t = today();
    let salesToday = db.sales.filter(s => s.date.startsWith(t)).reduce((a,s) => a + s.total, 0);
    let expToday = db.expenses.filter(e => e.date.startsWith(t)).reduce((a,e) => a + e.amount, 0);
    let net = salesToday - expToday;
    let givenUnpaid = db.debts_given.filter(d => d.status === 'unpaid').length;
    let takenUnpaid = db.debts_taken.filter(d => d.status === 'unpaid').length;
    document.getElementById('app').innerHTML = nav() + `
        <div class="row" style="margin-bottom:10px;">
            <div class="stat-box"><div class="num" style="color:var(--primary);">${fmt(salesToday)}</div><div class="lbl">💰 المبيعات</div></div>
            <div class="stat-box"><div class="num" style="color:var(--red);">${fmt(expToday)}</div><div class="lbl">💸 المصروفات</div></div>
            <div class="stat-box"><div class="num" style="color:${net>=0?'var(--green)':'var(--red)'};">${fmt(net)}</div><div class="lbl">🧾 الصافي</div></div>
        </div>
        <div class="row">
            <div class="stat-box"><div class="num">${givenUnpaid}</div><div class="lbl">📋 ديون لنا</div></div>
            <div class="stat-box"><div class="num">${takenUnpaid}</div><div class="lbl">📋 ديون علينا</div></div>
        </div>`;
}

// ========== المبيعات (تحكم كامل) ==========
function sales() {
    let db = DB();
    let productNames = db.products.map(p => p.name);
    let datalistOptions = productNames.map(n => `<option value="${n}">`).join('');

    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>🛒 تسجيل بيع جديد</h2>
            <div class="mb">
                <label>اسم القطعة (اكتب أو اختر من المخزون)</label>
                <input type="text" id="itemName" list="productList" placeholder="مثال: فلتر زيت">
                <datalist id="productList">${datalistOptions}</datalist>
            </div>
            <div class="row">
                <div><label>الكمية</label><input type="number" id="qty" value="1" min="1"></div>
                <div><label>سعر البيع (ريال)</label><input type="number" id="price" placeholder="أدخل السعر"></div>
            </div>
            <div class="row">
                <div><label>طريقة الدفع</label><select id="pay"><option value="cash">نقدي</option><option value="transfer">حوالة</option><option value="wallet">محفظة</option></select></div>
                <div><label>نوع البيع</label><select id="type"><option value="sale">بيع مباشر</option><option value="debt_given">دين للزبون (لنا)</option><option value="debt_taken">دين علينا (نحن مدينون)</option><option value="consign">صرف لمهندس (عهدة)</option></select></div>
            </div>
            <div id="entityBox" style="display:none;">
                <div class="row">
                    <div><label>اسم العميل / المهندس</label><input type="text" id="ename"></div>
                    <div><label>رقم الهاتف</label><input type="text" id="ephone"></div>
                </div>
            </div>
            <div class="row mt">
                <button class="btn btn-gold" onclick="doSale()">💲 إتمام البيع</button>
                <button class="btn btn-outline" onclick="resetSaleForm()">🔄 جديد</button>
            </div>
            <div id="msg" class="mt" style="font-weight:bold;"></div>
        </div>
        <div class="card">
            <h3>📋 آخر المبيعات</h3>
            <div id="recentSales">${recentSalesHTML()}</div>
        </div>`;
    document.getElementById('type').onchange = function() {
        document.getElementById('entityBox').style.display = this.value === 'sale' ? 'none' : 'block';
    };
    document.getElementById('itemName').oninput = function() {
        let selected = db.products.find(p => p.name === this.value);
        if (selected && !document.getElementById('price').value) {
            document.getElementById('price').value = selected.sellPrice;
        }
    };
}

function recentSalesHTML() {
    let db = DB();
    let list = db.sales.slice(-8).reverse();
    if (!list.length) return '<p class="text-sm">لا توجد مبيعات بعد</p>';
    return `<table><tr><th>التاريخ</th><th>القطعة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>النوع</th></tr>
        ${list.map(s => `<tr><td>${fdate(s.date)}</td><td>${s.product}</td><td>${s.qty}</td><td>${fmt(s.unitPrice)}</td><td>${fmt(s.total)}</td><td>${s.type==='sale'?'مباشر':s.type==='debt_given'?'دين لنا':s.type==='debt_taken'?'دين علينا':'عهدة'}</td></tr>`).join('')}</table>`;
}

function resetSaleForm() {
    document.getElementById('itemName').value = '';
    document.getElementById('qty').value = 1;
    document.getElementById('price').value = '';
    document.getElementById('pay').value = 'cash';
    document.getElementById('type').value = 'sale';
    document.getElementById('entityBox').style.display = 'none';
    document.getElementById('ename').value = '';
    document.getElementById('ephone').value = '';
    document.getElementById('msg').innerHTML = '';
}

function doSale() {
    let db = DB();
    let itemName = document.getElementById('itemName').value.trim();
    let qty = parseInt(document.getElementById('qty').value);
    let price = parseFloat(document.getElementById('price').value);
    let pay = document.getElementById('pay').value;
    let type = document.getElementById('type').value;
    let ename = type !== 'sale' ? document.getElementById('ename').value.trim() : '';
    let ephone = type !== 'sale' ? document.getElementById('ephone').value.trim() : '';

    if (!itemName || !qty || !price) {
        document.getElementById('msg').innerHTML = '<span class="text-red">❌ يجب ملء اسم القطعة والكمية والسعر</span>';
        return;
    }
    if (qty <= 0 || price <= 0) {
        document.getElementById('msg').innerHTML = '<span class="text-red">❌ الكمية والسعر يجب أن يكونا أكبر من صفر</span>';
        return;
    }
    if ((type === 'debt_given' || type === 'debt_taken' || type === 'consign') && !ename) {
        document.getElementById('msg').innerHTML = '<span class="text-red">❌ يجب إدخال اسم العميل/المهندس</span>';
        return;
    }

    let total = price * qty;
    let saleId = uid();
    db.sales.push({
        id: saleId, date: now(), product: itemName, qty, unitPrice: price, total,
        payment: pay, type, ename, ephone
    });

    if (type === 'debt_given') {
        db.debts_given.push({ id: uid(), saleId, ename, ephone, amount: total, date: now(), product: itemName, status: 'unpaid' });
    } else if (type === 'debt_taken') {
        db.debts_taken.push({ id: uid(), saleId, ename, ephone, amount: total, date: now(), product: itemName, status: 'unpaid' });
    } else if (type === 'consign') {
        db.consign.push({ id: uid(), saleId, ename, ephone, product: itemName, qty, date: now(), status: 'active' });
    }

    let prod = db.products.find(p => p.name === itemName);
    if (prod) {
        prod.qty = Math.max(0, prod.qty - qty);
    }

    save(db);
    document.getElementById('msg').innerHTML = `<span class="text-green">✅ تم بيع ${qty} ${itemName} بـ ${fmt(total)}</span>`;
    document.getElementById('recentSales').innerHTML = recentSalesHTML();
    resetSaleForm();
}

// ========== ديون لنا ==========
function debts_given() {
    let db = DB();
    let list = db.debts_given.filter(d => d.status === 'unpaid');
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>📋 ديون لنا (نحن دائنون)</h2>
            <table>
                <tr><th>الزبون</th><th>القطعة</th><th>المبلغ</th><th>التاريخ</th><th>هاتف</th><th></th></tr>
                ${list.length ? list.map(d => `
                    <tr><td>${d.ename}</td><td>${d.product}</td><td>${fmt(d.amount)}</td><td>${fdate(d.date)}</td><td>${d.ephone||'—'}</td>
                    <td><button class="btn btn-sm btn-green" onclick="settleGiven('${d.id}')">✅ سدد</button></td></tr>`).join('') : '<tr><td colspan="6">لا توجد ديون معلقة</td></tr>'}
            </table>
        </div>`;
}
function settleGiven(id) {
    let db = DB();
    let d = db.debts_given.find(x => x.id === id);
    if (!d) return;
    d.status = 'settled'; d.settledDate = now();
    save(db);
    generatePDF('سند استلام دين', d.ename, [
        { label: 'نوع المعاملة', value: 'دين لنا – العميل مدين لنا' },
        { label: 'القطعة', value: d.product },
        { label: 'تاريخ الدين', value: fdate(d.date) },
        { label: 'المبلغ المسدد', value: fmt(d.amount), color: 'green' },
        { label: 'المبلغ المتبقي', value: fmt(0), color: 'red' },
        { label: 'تاريخ السداد', value: fdate(now()) }
    ], `سند_دين_${d.ename}.pdf`);
    debts_given();
}

// ========== ديون علينا (دفاتر فردية) ==========
function debts_taken() {
    let db = DB();
    let map = {};
    db.debts_taken.forEach(d => {
        if (!map[d.ename]) map[d.ename] = { total: 0, unpaid: 0, settled: 0, count: 0 };
        map[d.ename].total += d.amount;
        map[d.ename].count++;
        if (d.status === 'unpaid') map[d.ename].unpaid += d.amount;
        else map[d.ename].settled += d.amount;
    });
    let clients = Object.entries(map);
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>📋 ديون علينا – حسابات العملاء</h2>
            <table>
                <tr><th>العميل</th><th>عدد العمليات</th><th>الإجمالي</th><th>المسدد</th><th>المتبقي</th><th></th></tr>
                ${clients.length ? clients.map(([name, data]) => `
                    <tr><td><strong>${name}</strong></td><td>${data.count}</td><td>${fmt(data.total)}</td>
                    <td class="text-green">${fmt(data.settled)}</td><td class="text-red">${fmt(data.unpaid)}</td>
                    <td><button class="btn btn-sm btn-outline" onclick="clientLedger('${name}')">📂 فتح</button></td></tr>`).join('') : '<tr><td colspan="6">لا توجد ديون</td></tr>'}
            </table>
        </div>`;
}
function clientLedger(name) {
    let db = DB();
    let debts = db.debts_taken.filter(d => d.ename === name).sort((a,b) => new Date(a.date) - new Date(b.date));
    let total = debts.reduce((s,d) => s + d.amount, 0);
    let settled = debts.filter(d => d.status === 'settled').reduce((s,d) => s + d.amount, 0);
    let unpaid = total - settled;
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>📂 دفتر حساب: ${name}</h2>
            <div class="row mb">
                <div class="stat-box"><div class="num">${fmt(total)}</div><div class="lbl">الإجمالي</div></div>
                <div class="stat-box"><div class="num text-green">${fmt(settled)}</div><div class="lbl">المسدد</div></div>
                <div class="stat-box"><div class="num text-red">${fmt(unpaid)}</div><div class="lbl">المتبقي</div></div>
            </div>
            <table>
                <tr><th>التاريخ</th><th>القطعة</th><th>المبلغ</th><th>الحالة</th><th></th></tr>
                ${debts.map(d => `<tr><td>${fdate(d.date)}</td><td>${d.product}</td><td>${fmt(d.amount)}</td>
                <td><span class="tag ${d.status==='settled'?'tag-green':'tag-red'}">${d.status==='settled'?'مسدد':'متبقي'}</span></td>
                <td>${d.status==='unpaid' ? `<button class="btn btn-sm btn-green" onclick="settleTaken('${d.id}','${name}')">✅ سدد</button>` : ''}</td></tr>`).join('')}
            </table>
            <button class="btn btn-outline mt" onclick="debts_taken()">🔙 رجوع</button>
            <button class="btn btn-gold mt" onclick="exportClientPDF('${name}')">📄 تصدير PDF</button>
        </div>`;
}
function settleTaken(id, name) {
    let db = DB();
    let d = db.debts_taken.find(x => x.id === id);
    if (!d) return;
    d.status = 'settled'; d.settledDate = now();
    save(db);
    generatePDF('سند سداد دين', d.ename, [
        { label: 'نوع المعاملة', value: 'دين علينا – نحن مدينون للعميل' },
        { label: 'القطعة', value: d.product },
        { label: 'تاريخ الدين', value: fdate(d.date) },
        { label: 'المبلغ المسدد', value: fmt(d.amount), color: 'green' },
        { label: 'المبلغ المتبقي', value: fmt(0), color: 'red' },
        { label: 'تاريخ السداد', value: fdate(now()) }
    ], `سند_سداد_${d.ename}.pdf`);
    clientLedger(name);
}
function exportClientPDF(name) {
    let db = DB();
    let debts = db.debts_taken.filter(d => d.ename === name).sort((a,b) => new Date(a.date) - new Date(b.date));
    let total = debts.reduce((s,d) => s + d.amount, 0);
    let settled = debts.filter(d => d.status === 'settled').reduce((s,d) => s + d.amount, 0);
    let unpaid = total - settled;
    let details = [
        { label: 'إجمالي الدين', value: fmt(total) },
        { label: 'إجمالي المسدد', value: fmt(settled), color: 'green' },
        { label: 'إجمالي المتبقي', value: fmt(unpaid), color: 'red' },
        { label: 'عدد العمليات', value: debts.length.toString() }
    ];
    debts.forEach((d, i) => {
        details.push({ label: `عملية ${i+1}`, value: `${d.product} | ${fdate(d.date)} | ${fmt(d.amount)} | ${d.status==='settled'?'مسدد':'متبقي'}` });
    });
    generatePDF('كشف حساب عميل', name, details, `كشف_حساب_${name}.pdf`);
}

// ========== العهد ==========
function consign() {
    let db = DB();
    let list = db.consign.filter(c => c.status === 'active');
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>🔩 عهد المهندسين</h2>
            <table>
                <tr><th>المهندس</th><th>القطعة</th><th>الكمية</th><th>تاريخ</th><th></th></tr>
                ${list.length ? list.map(c => `<tr><td>${c.ename}</td><td>${c.product}</td><td>${c.qty}</td><td>${fdate(c.date)}</td>
                <td><button class="btn btn-sm btn-green" onclick="returnConsign('${c.id}')">🔄 إرجاع</button></td></tr>`).join('') : '<tr><td colspan="5">لا توجد عهد نشطة</td></tr>'}
            </table>
        </div>`;
}
function returnConsign(id) {
    let db = DB();
    let c = db.consign.find(x => x.id === id);
    if (!c) return;
    c.status = 'returned'; c.returnedDate = now();
    save(db);
    generatePDF('سند إرجاع عهدة', c.ename, [
        { label: 'القطعة', value: c.product },
        { label: 'الكمية', value: c.qty.toString() },
        { label: 'تاريخ الصرف', value: fdate(c.date) },
        { label: 'تاريخ الإرجاع', value: fdate(now()) }
    ], `سند_عهدة_${c.ename}.pdf`);
    consign();
}

// ========== العمال ==========
function workers() {
    let db = DB();
    let t = today();
    let ms = monthStart();
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>👷 حسابات العمال</h2>
            ${user.role === 'manager' ? '<button class="btn btn-gold mb" onclick="addWorkerForm()">➕ إضافة عامل</button>' : ''}
            <table>
                <tr><th>العامل</th><th>الراتب</th><th>مسحوبات اليوم</th><th>إجمالي الشهر</th><th>الصافي</th><th></th></tr>
                ${db.workers.map(w => {
                    let daily = db.worker_draws.filter(d => d.workerId === w.id && d.date.startsWith(t));
                    let dailyTotal = daily.reduce((a,d) => a + d.amount, 0);
                    let month = db.worker_draws.filter(d => d.workerId === w.id && d.date >= ms);
                    let monthTotal = month.reduce((a,d) => a + d.amount, 0);
                    let net = w.salary - monthTotal;
                    return `<tr><td>${w.name}<br><span class="text-sm">${w.phone||''}</span></td><td>${fmt(w.salary)}</td>
                    <td>${dailyTotal ? fmt(dailyTotal) : '—'}</td><td>${fmt(monthTotal)}</td>
                    <td style="color:${net>=0?'var(--green)':'var(--red)'}; font-weight:bold;">${net>=0?'باقي له: ':'باقي عليه: '}${fmt(Math.abs(net))}</td>
                    <td>${user.role==='manager'?`<button class="btn btn-sm btn-outline" onclick="drawForm('${w.id}')">➕ سحب</button>`:''}</td></tr>`;
                }).join('') || '<tr><td colspan="6">لا يوجد عمال</td></tr>'}
            </table>
        </div>`;
}
function addWorkerForm() {
    document.getElementById('app').innerHTML = nav() + `
        <div class="card"><h2>➕ إضافة عامل</h2>
        <input type="text" id="wname" placeholder="اسم العامل" class="mb">
        <input type="text" id="wphone" placeholder="رقم الهاتف" class="mb">
        <input type="number" id="wsalary" placeholder="الراتب الشهري" class="mb">
        <button class="btn btn-gold" onclick="addWorker()">حفظ</button>
        <button class="btn btn-outline mt" onclick="workers()">رجوع</button></div>`;
}
function addWorker() {
    let db = DB();
    let n = document.getElementById('wname').value.trim();
    let p = document.getElementById('wphone').value.trim();
    let s = parseInt(document.getElementById('wsalary').value);
    if (!n || !s) return toast('أكمل البيانات');
    db.workers.push({ id: uid(), name: n, phone: p, salary: s });
    save(db); workers();
}
function drawForm(workerId) {
    let db = DB();
    let w = db.workers.find(x => x.id === workerId);
    document.getElementById('app').innerHTML = nav() + `
        <div class="card"><h2>➕ سحب للعامل: ${w?.name||''}</h2>
        <input type="number" id="damount" placeholder="المبلغ" class="mb">
        <input type="text" id="dreason" placeholder="السبب" class="mb">
        <button class="btn btn-gold" onclick="doDraw('${workerId}')">حفظ</button>
        <button class="btn btn-outline mt" onclick="workers()">رجوع</button></div>`;
}
function doDraw(workerId) {
    let amt = parseInt(document.getElementById('damount').value);
    let reason = document.getElementById('dreason').value.trim();
    if (!amt) return toast('أدخل المبلغ');
    let db = DB();
    db.worker_draws.push({ id: uid(), workerId, amount: amt, reason, date: now() });
    save(db); workers();
}

// ========== المخزون ==========
function products() {
    if (user.role !== 'manager') return dashboard();
    let db = DB();
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>📦 المخزون</h2>
            <button class="btn btn-gold mb" onclick="addProductForm()">➕ إضافة قطعة</button>
            <table>
                <tr><th>القطعة</th><th>الكود</th><th>سعر البيع</th><th>الكمية</th><th></th></tr>
                ${db.products.map(p => `<tr><td>${p.name}</td><td>${p.code}</td><td>${fmt(p.sellPrice)}</td>
                <td style="color:${p.qty<=3?'var(--red)':''}">${p.qty}</td>
                <td><button class="btn btn-sm btn-outline" onclick="editProductForm('${p.id}')">✏️</button></td></tr>`).join('')}
            </table>
        </div>`;
}
function addProductForm() {
    document.getElementById('app').innerHTML = nav() + `
        <div class="card"><h2>➕ إضافة قطعة</h2>
        <input type="text" id="pname" placeholder="اسم القطعة" class="mb">
        <input type="text" id="pcode" placeholder="كود تويوتا" class="mb">
        <input type="number" id="pprice" placeholder="سعر البيع" class="mb">
        <input type="number" id="pqty" placeholder="الكمية" class="mb">
        <button class="btn btn-gold" onclick="addProduct()">حفظ</button>
        <button class="btn btn-outline mt" onclick="products()">رجوع</button></div>`;
}
function addProduct() {
    let db = DB();
    let n = document.getElementById('pname').value.trim();
    let c = document.getElementById('pcode').value.trim();
    let p = parseInt(document.getElementById('pprice').value);
    let q = parseInt(document.getElementById('pqty').value);
    if (!n || !p || !q) return toast('أكمل البيانات');
    db.products.push({ id: uid(), name: n, code: c, sellPrice: p, qty: q });
    save(db); products();
}
function editProductForm(id) {
    let db = DB(); let p = db.products.find(x => x.id === id);
    document.getElementById('app').innerHTML = nav() + `
        <div class="card"><h2>✏️ تعديل قطعة</h2>
        <input type="text" id="epname" value="${p.name}" class="mb">
        <input type="text" id="epcode" value="${p.code||''}" class="mb">
        <input type="number" id="epprice" value="${p.sellPrice}" class="mb">
        <input type="number" id="epqty" value="${p.qty}" class="mb">
        <button class="btn btn-gold" onclick="updateProduct('${id}')">حفظ</button>
        <button class="btn btn-outline mt" onclick="products()">رجوع</button></div>`;
}
function updateProduct(id) {
    let db = DB(); let p = db.products.find(x => x.id === id);
    p.name = document.getElementById('epname').value.trim();
    p.code = document.getElementById('epcode').value.trim();
    p.sellPrice = parseInt(document.getElementById('epprice').value);
    p.qty = parseInt(document.getElementById('epqty').value);
    save(db); products();
}

// ========== مصروفات ==========
function expenses() {
    if (user.role !== 'manager') return dashboard();
    let db = DB();
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>💸 المصروفات</h2>
            <button class="btn btn-gold mb" onclick="addExpenseForm()">➕ تسجيل مصروف</button>
            <table>
                <tr><th>السبب</th><th>المبلغ</th><th>التاريخ</th></tr>
                ${db.expenses.slice(-20).reverse().map(e => `<tr><td>${e.reason}</td><td>${fmt(e.amount)}</td><td>${fdate(e.date)}</td></tr>`).join('') || '<tr><td colspan="3">لا توجد مصروفات</td></tr>'}
            </table>
        </div>`;
}
function addExpenseForm() {
    let db = DB();
    let wOpts = db.workers.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    document.getElementById('app').innerHTML = nav() + `
        <div class="card"><h2>➕ تسجيل مصروف</h2>
        <input type="text" id="ereason" placeholder="السبب" class="mb">
        <input type="number" id="eamount" placeholder="المبلغ" class="mb">
        <select id="eworker" class="mb"><option value="">غير مرتبط بعامل</option>${wOpts}</select>
        <button class="btn btn-gold" onclick="addExpense()">حفظ</button>
        <button class="btn btn-outline mt" onclick="expenses()">رجوع</button></div>`;
}
function addExpense() {
    let db = DB();
    let r = document.getElementById('ereason').value.trim();
    let a = parseInt(document.getElementById('eamount').value);
    let wid = document.getElementById('eworker').value;
    if (!r || !a) return toast('أكمل البيانات');
    db.expenses.push({ id: uid(), reason: r, amount: a, workerId: wid || null, date: now() });
    if (wid) db.worker_draws.push({ id: uid(), workerId: wid, amount: a, reason: `مصروف: ${r}`, date: now() });
    save(db); expenses();
}

// ========== تقارير ==========
function reports() {
    if (user.role !== 'manager') return dashboard();
    let db = DB(), t = today();
    let salesToday = db.sales.filter(s => s.date.startsWith(t)).reduce((a,s) => a + s.total, 0);
    let expToday = db.expenses.filter(e => e.date.startsWith(t)).reduce((a,e) => a + e.amount, 0);
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>📑 تقارير</h2>
            <p>📅 ${fdate(today())}</p>
            <table>
                <tr><td>💰 المبيعات</td><td class="text-green">${fmt(salesToday)}</td></tr>
                <tr><td>💸 المصروفات</td><td class="text-red">${fmt(expToday)}</td></tr>
                <tr><td>🧾 الصافي</td><td style="font-weight:bold;">${fmt(salesToday-expToday)}</td></tr>
            </table>
            <button class="btn btn-gold mt" onclick="monthlyReport()">📄 تقرير شهري PDF</button>
        </div>`;
}
function monthlyReport() {
    let db = DB();
    let ms = monthStart();
    let sales = db.sales.filter(s => s.date >= ms).reduce((a,s) => a + s.total, 0);
    let exp = db.expenses.filter(e => e.date >= ms).reduce((a,e) => a + e.amount, 0);
    generatePDF('تقرير شهري', 'جميع الأطراف', [
        { label: 'إجمالي المبيعات', value: fmt(sales), color: 'green' },
        { label: 'إجمالي المصروفات', value: fmt(exp), color: 'red' },
        { label: 'الصافي', value: fmt(sales - exp) },
        { label: 'ديون لنا مسددة', value: db.debts_given.filter(d=>d.status==='settled'&&d.settledDate>=ms).length.toString() },
        { label: 'ديون علينا مسددة', value: db.debts_taken.filter(d=>d.status==='settled'&&d.settledDate>=ms).length.toString() }
    ], `تقرير_شهري_${today()}.pdf`);
}

// ========== مزامنة ==========
function sync() {
    document.getElementById('app').innerHTML = nav() + `
        <div class="card">
            <h2>🔄 مزامنة</h2>
            ${user.role === 'employee' ?
                '<button class="btn btn-gold" onclick="exportData()">📤 تصدير JSON</button>' :
                '<button class="btn btn-gold" onclick="document.getElementById(\'imp\').click()">📥 استيراد JSON</button><input type="file" id="imp" accept=".json" onchange="importData(this)" style="display:none;">'
            }
        </div>`;
}
function exportData() {
    let db = DB();
    let blob = new Blob([JSON.stringify(db)], { type: 'application/json' });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `مزامنة_${today()}.json`;
    a.click();
    toast('📤 تم التصدير');
}
function importData(input) {
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data = JSON.parse(e.target.result);
            if (data.products && data.sales) {
                save(data);
                toast('✅ تم الدمج');
                dashboard();
            }
        } catch(err) { toast('❌ خطأ'); }
    };
    reader.readAsText(input.files[0]);
}

// ========== PDF احترافي ==========
function generatePDF(title, client, details, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(26, 26, 46);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(201, 168, 76);
    doc.setFontSize(22);
    doc.text('طيب علي الأشول', 105, 18, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('قطع غيار تويوتا | نظام محاسبي', 105, 28, { align: 'center' });
    doc.setTextColor(26, 26, 46);
    doc.setFontSize(16);
    doc.text(title, 105, 48, { align: 'center' });
    doc.setDrawColor(201, 168, 76);
    doc.line(25, 52, 185, 52);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`العميل: ${client}`, 15, 62);
    let y = 72;
    doc.setFontSize(10);
    details.forEach(d => {
        if (d.color === 'green') doc.setTextColor(45, 106, 79);
        else if (d.color === 'red') doc.setTextColor(198, 40, 40);
        else doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "bold");
        doc.text(`${d.label}:`, 15, y);
        doc.setFont("helvetica", "normal");
        doc.text(d.value, 80, y);
        y += 9;
    });
    y += 10;
    doc.setDrawColor(26, 58, 92);
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(65, y, 80, 20, 3, 3, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 58, 92);
    doc.setFontSize(12);
    doc.text('طيب علي الأشول', 105, y + 9, { align: 'center' });
    doc.setFontSize(7);
    doc.text('ختم رسمي', 105, y + 15, { align: 'center' });
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(7);
    doc.text(`صادر بتاريخ: ${fdate(now())}`, 105, 285, { align: 'center' });
    doc.save(filename);
    toast('📄 تم إصدار PDF');
}

// ========== تشغيل ==========
renderLogin();