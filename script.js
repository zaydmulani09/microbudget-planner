import { createNoise2D } from 'simplex-noise';

// --- Global State & V2 Entities ---
let transactions = [];
let goals = [];
let badges = [];
let currentTutorialStep = 0;
let settings = {
    theme: 'dark',
    reminders: false,
    tutorialCompleted: false,
    lastLogin: null,
    streak: 0
};

const CATEGORIES = {
    expense: [
        { id: 'food', icon: 'utensils', label: 'Food & Dining', color: '#ef4444' },
        { id: 'transport', icon: 'car', label: 'Transportation', color: '#f59e0b' },
        { id: 'shopping', icon: 'shopping-bag', label: 'Shopping', color: '#ec4899' },
        { id: 'bills', icon: 'file-text', label: 'Bills & Utilities', color: '#8b5cf6' },
        { id: 'entertainment', icon: 'gamepad-2', label: 'Entertainment', color: '#3b82f6' },
        { id: 'other', icon: 'more-horizontal', label: 'Other', color: '#64748b' }
    ],
    income: [
        { id: 'salary', icon: 'briefcase', label: 'Salary', color: '#10b981' },
        { id: 'gift', icon: 'gift', label: 'Gift', color: '#f43f5e' },
        { id: 'transfer', icon: 'repeat', label: 'Transfer', color: '#0ea5e9' },
        { id: 'other_income', icon: 'plus-circle', label: 'Other Income', color: '#64748b' }
    ]
};

const BADGES_CONFIG = [
    { id: 'first_tx', label: 'First Step', icon: 'star', description: 'Log your first transaction' },
    { id: 'streak_3', label: 'Triple Threat', icon: 'flame', description: '3 day logging streak' },
    { id: 'goal_met', icon: 'target', label: 'Visionary', description: 'Complete your first goal' },
    { id: 'big_saver', icon: 'shield-check', label: 'Grand Master', description: 'Save over $1000' }
];

const TUTORIAL_STEPS = [
    { title: "Welcome to V2", text: "MicroBudget is now more powerful. We've added goals, streaks, and receipt tracking!" },
    { title: "Navigation", text: "Use the sidebar to explore your Ledger, Goals, and Achievement milestones." },
    { title: "The FAB", text: "Click the floating '+' button to log transactions, set recurring rules, or upload receipts." }
];

// --- IndexedDB Wrapper ---
const dbName = "MicroBudgetDB";
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 3);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('transactions')) db.createObjectStore('transactions', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('goals')) db.createObjectStore('goals', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('badges')) db.createObjectStore('badges', { keyPath: 'id' });
        };
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        request.onerror = (e) => reject(e);
    });
}

async function dbGet(storeName, key) {
    return new Promise((resolve) => {
        const txn = db.transaction(storeName, "readonly");
        const store = txn.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
    });
}

async function dbGetAll(storeName) {
    return new Promise((resolve) => {
        const txn = db.transaction(storeName, "readonly");
        const store = txn.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
    });
}

async function dbPut(storeName, value) {
    return new Promise((resolve) => {
        const txn = db.transaction(storeName, "readwrite");
        const store = txn.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve();
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve) => {
        const txn = db.transaction(storeName, "readwrite");
        const store = txn.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
    });
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    await loadData();
    lucide.createIcons();
    initWaves();
    setupEventListeners();
    setupTheming();
    setupDropZone();
    renderAll();
    checkStreaks();
    await checkRecurring();
    if (!settings.tutorialCompleted) startTutorial();
    
    document.getElementById('tx-date').valueAsDate = new Date();
    updateCategories();
});

async function loadData() {
    transactions = await dbGetAll('transactions');
    goals = await dbGetAll('goals');
    badges = await dbGetAll('badges');
    const savedSettings = await dbGet('settings', 'app_settings');
    if (savedSettings) {
        settings = { ...settings, ...savedSettings };
        const rt = document.getElementById('reminder-toggle');
        if (rt) rt.checked = settings.reminders;
        const tt = document.getElementById('theme-toggle');
        if (tt) tt.checked = settings.theme === 'dark';
    }
}

async function saveSettings() {
    await dbPut('settings', { id: 'app_settings', ...settings });
}

function setupTheming() {
    document.documentElement.setAttribute('data-theme', settings.theme);
}

function toggleTheme() {
    const tt = document.getElementById('theme-toggle');
    if (tt) settings.theme = tt.checked ? 'dark' : 'light';
    else settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', settings.theme);
    saveSettings();
}

// --- Waves Background Logic (Restored) ---
let pT_noise2D = null;
let pT_container = null;
let pT_svg = null;
let pT_pointer = null;
let pT_mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
let pT_paths = [];
let pT_lines = [];
let pT_raf = null;

function initWaves() {
    pT_container = document.getElementById('waves-bg');
    pT_svg = document.getElementById('waves-svg');
    pT_pointer = document.getElementById('waves-pointer');
    if(!pT_container || !pT_svg) return;
    pT_noise2D = createNoise2D();
    pT_setSize();
    pT_setLines();
    window.addEventListener('resize', () => { pT_setSize(); pT_setLines(); });
    window.addEventListener('mousemove', (e) => { pT_updateMousePosition(e.pageX, e.pageY); });
    pT_container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        pT_updateMousePosition(touch.clientX, touch.clientY);
    }, { passive: false });
    pT_raf = requestAnimationFrame(pT_tick);
}

function pT_setSize() {
    if (!pT_container || !pT_svg) return;
    const rect = pT_container.getBoundingClientRect();
    pT_svg.style.width = `${rect.width}px`;
    pT_svg.style.height = `${rect.height}px`;
}

function pT_setLines() {
    if (!pT_container || !pT_svg) return;
    const rect = pT_container.getBoundingClientRect();
    const width = rect.width, height = rect.height;
    pT_lines = [];
    pT_paths.forEach(path => path.remove());
    pT_paths = [];
    const xGap = 8, yGap = 8;
    const oWidth = width + 200, oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / xGap), totalPoints = Math.ceil(oHeight / yGap);
    const xStart = (width - xGap * totalLines) / 2, yStart = (height - yGap * totalPoints) / 2;

    for (let i = 0; i < totalLines; i++) {
        const points = [];
        for (let j = 0; j < totalPoints; j++) {
            points.push({ x: xStart + xGap * i, y: yStart + yGap * j, wave: { x: 0, y: 0 }, cursor: { x: 0, y: 0, vx: 0, vy: 0 } });
        }
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('a__line', 'js-line');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#ffffff');
        path.setAttribute('stroke-width', '1');
        pT_svg.appendChild(path);
        pT_paths.push(path);
        pT_lines.push(points);
    }
}

function pT_updateMousePosition(x, y) {
    if (!pT_container) return;
    const rect = pT_container.getBoundingClientRect();
    pT_mouse.x = x - rect.left;
    pT_mouse.y = y - rect.top + window.scrollY;
    if (!pT_mouse.set) {
        pT_mouse.sx = pT_mouse.lx = pT_mouse.x;
        pT_mouse.sy = pT_mouse.ly = pT_mouse.y;
        pT_mouse.set = true;
    }
    pT_container.style.setProperty('--x', `${pT_mouse.sx}px`);
    pT_container.style.setProperty('--y', `${pT_mouse.sy}px`);
}

function pT_movePoints(time) {
    if (!pT_noise2D) return;
    pT_lines.forEach(points => {
        points.forEach(p => {
            const move = pT_noise2D((p.x + time * 0.008) * 0.003, (p.y + time * 0.003) * 0.002) * 8;
            p.wave.x = Math.cos(move) * 12;
            p.wave.y = Math.sin(move) * 6;
            const dx = p.x - pT_mouse.sx, dy = p.y - pT_mouse.sy, d = Math.hypot(dx, dy), l = Math.max(175, pT_mouse.vs);
            if (d < l) {
                const s = 1 - d / l, f = Math.cos(d * 0.001) * s;
                p.cursor.vx += Math.cos(pT_mouse.a) * f * l * pT_mouse.vs * 0.00035;
                p.cursor.vy += Math.sin(pT_mouse.a) * f * l * pT_mouse.vs * 0.00035;
            }
            p.cursor.vx += (0 - p.cursor.x) * 0.01;
            p.cursor.vy += (0 - p.cursor.y) * 0.01;
            p.cursor.vx *= 0.95; p.cursor.vy *= 0.95;
            p.cursor.x += p.cursor.vx; p.cursor.y += p.cursor.vy;
            p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
            p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
        });
    });
}

function pT_moved(point, withCursorForce = true) {
    return { x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0), y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0) };
}

function pT_drawLines() {
    pT_lines.forEach((points, lIndex) => {
        if (points.length < 2 || !pT_paths[lIndex]) return;
        const firstPoint = pT_moved(points[0], false);
        let d = `M ${firstPoint.x} ${firstPoint.y}`;
        for (let i = 1; i < points.length; i++) {
            const current = pT_moved(points[i]);
            d += `L ${current.x} ${current.y}`;
        }
        pT_paths[lIndex].setAttribute('d', d);
    });
}

function pT_tick(time) {
    pT_mouse.sx += (pT_mouse.x - pT_mouse.sx) * 0.1;
    pT_mouse.sy += (pT_mouse.y - pT_mouse.sy) * 0.1;
    const dx = pT_mouse.x - pT_mouse.lx, dy = pT_mouse.y - pT_mouse.ly, d = Math.hypot(dx, dy);
    pT_mouse.v = d;
    pT_mouse.vs += (d - pT_mouse.vs) * 0.1;
    pT_mouse.vs = Math.min(100, pT_mouse.vs);
    pT_mouse.lx = pT_mouse.x; pT_mouse.ly = pT_mouse.y;
    pT_mouse.a = Math.atan2(dy, dx);
    pT_movePoints(time);
    pT_drawLines();
    pT_raf = requestAnimationFrame(pT_tick);
}

// --- Features Logic ---
function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const targetBtn = e.target.closest('.nav-btn');
            targetBtn.classList.add('active');
            switchView(targetBtn.dataset.view);
        });
    });

    document.getElementById('tx-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('goal-form').addEventListener('submit', handleGoalSubmit);
    document.getElementById('tutorial-next').addEventListener('click', nextTutorialStep);
    document.getElementById('tutorial-skip').addEventListener('click', endTutorial);
    
    // Theme Toggle Listener
    const themeSwitch = document.querySelector('[data-view="settings"]'); 
    // In settings view we could add a toggle, for now theme is handled via toggleTheme() manually in the console or a future UI button.
    // Let's add a proper theme toggle button to the settings view in HTML if needed, but for now I'll stick to the JS logic.

    const reminderToggle = document.getElementById('reminder-toggle');
    if (reminderToggle) reminderToggle.addEventListener('change', (e) => {
         settings.reminders = e.target.checked;
         saveSettings();
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove('hidden');
    if (viewId === 'dashboard') {
        renderAll();
        drawBalanceTrees();
    }
    if (viewId === 'goals') renderGoals();
    if (viewId === 'achievements') renderAchievements();
}

// --- Goal Logic ---
window.openGoalModal = () => document.getElementById('goal-modal').classList.remove('hidden');
window.closeGoalModal = () => document.getElementById('goal-modal').classList.add('hidden');

async function handleGoalSubmit(e) {
    e.preventDefault();
    const goal = {
        id: Date.now().toString(),
        name: document.getElementById('goal-name').value,
        target: parseFloat(document.getElementById('goal-target').value),
        current: parseFloat(document.getElementById('goal-current').value),
        createdAt: Date.now()
    };
    await dbPut('goals', goal);
    goals.push(goal);
    closeGoalModal();
    renderGoals();
    updateGoalDropdown();
    checkBadges();
}

function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    container.innerHTML = goals.map(g => {
        const progress = g.target > 0 ? (g.currentProgress / g.target) * 100 : 0;
        return `
            <div class="bento-card glass-panel goal-card">
                <div class="flex-between mb-2">
                    <h4>${g.name}</h4>
                    <button class="icon-btn text-xs" onclick="deleteGoal('${g.id}')"><i data-lucide="trash-2"></i></button>
                </div>
                <div class="goal-progress-container">
                    <div class="goal-progress-fill" style="width: ${Math.min(100, progress)}%;"></div>
                </div>
                <p class="text-xs text-muted">$${(g.currentProgress || 0).toLocaleString()} / $${g.target.toLocaleString()}</p>
            </div>
        `;
    }).join('') + `
        <div class="bento-card glass-panel goal-card flex-center cursor-pointer" onclick="openGoalModal()">
            <i data-lucide="plus" style="width: 40px; height: 40px; opacity: 0.2;"></i>
        </div>
    `;
    lucide.createIcons();
    updateGoalDropdown();
}

function updateGoalDropdown() {
    const select = document.getElementById('tx-goal');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">None</option>' + 
        goals.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    select.value = currentVal;
}

window.deleteGoal = async (id) => {
    await dbDelete('goals', id);
    goals = goals.filter(g => g.id !== id);
    renderGoals();
}

// --- Data Portability ---
window.exportData = () => {
    const data = { transactions, goals, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `microbudget_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
};

window.importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            // Overwrite all
            for (const tx of data.transactions || []) await dbPut('transactions', tx);
            for (const g of data.goals || []) await dbPut('goals', g);
            if (data.settings) {
                settings = { ...settings, ...data.settings };
                await saveSettings();
            }
            alert('Data imported successfully! Reloading...');
            location.reload();
        } catch (err) {
            alert('Error importing data. Please check the file format.');
        }
    };
    reader.readAsText(file);
};

// --- Recurring logic ---
async function checkRecurring() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let updated = false;

    // Filter for recurring transactions that were logged earlier than today
    const recurringParents = transactions.filter(t => t.isRecurring && t.date < todayStr);
    
    for (const parent of recurringParents) {
        // Simple logic: if it's recurring and from a previous date, 
        // check if we've already generated one for today.
        // In a real app we'd check internal (daily, weekly, etc.)
        const hasToday = transactions.find(t => t.parentId === parent.id && t.date === todayStr);
        
        if (!hasToday) {
            const newTx = {
                ...parent,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                date: todayStr,
                parentId: parent.id,
                timestamp: Date.now()
            };
            delete newTx.isPinned; // Don't pin child recurring by default?
            await dbPut('transactions', newTx);
            transactions.push(newTx);
            updated = true;
        }
    }
    if (updated) renderAll();
}

// --- Chart Animation Refined ---
function drawChart() {
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width, height = canvas.height;
    
    const categoryTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + t.amount;
    });

    const data = Object.entries(categoryTotals).map(([id, amount]) => {
        const cat = CATEGORIES.expense.find(c => c.id === id);
        return { label: cat.label, amount, color: cat.color };
    });

    if (!data.length) {
        ctx.clearRect(0,0,width,height);
        return;
    }

    const total = data.reduce((sum, d) => sum + d.amount, 0);
    
    let animationProgress = 0;
    const animate = () => {
        animationProgress += 0.05;
        if (animationProgress > 1) animationProgress = 1;

        let startAngle = -Math.PI / 2;
        ctx.clearRect(0,0,width,height);
        
        data.forEach(d => {
            const sliceAngle = (d.amount / total) * 2 * Math.PI * animationProgress;
            ctx.beginPath();
            ctx.moveTo(width/2, height/2);
            ctx.arc(width/2, height/2, width/2.5, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = d.color;
            ctx.fill();
            startAngle += sliceAngle;
        });

        // Inner hole for Donut effect
        ctx.beginPath();
        ctx.arc(width/2, height/2, width/4, 0, 2 * Math.PI);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--glass-bg');
        ctx.fill();

        if (animationProgress < 1) requestAnimationFrame(animate);
    };
    animate();
}

// --- Transaction CRUD with V2 features ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('tx-id').value || Date.now().toString();
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const categoryId = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('tx-note').value;
    const isRecurring = document.getElementById('tx-recurring').checked;
    const isPinned = document.getElementById('tx-pinned').checked;
    const goalId = document.getElementById('tx-goal').value;
    
    const previewImg = document.querySelector('#image-preview img');
    const image = previewImg ? previewImg.src : null;

    const txData = { id, type, amount, categoryId, date, note, isRecurring, isPinned, goalId, image, timestamp: Date.now() };
    
    await dbPut('transactions', txData);
    await loadData();
    closeModal();
    renderAll();
    checkBadges();
}

function renderAll() {
    calculateStats();
    renderTransactions();
    renderRecent();
    drawChart();
    updateGoalsProgress();
    drawBalanceTrees();
}

function calculateStats() {
    let income = 0, expense = 0;
    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
    });
    const incomeEl = document.getElementById('dash-income');
    const expenseEl = document.getElementById('dash-expense');
    const balanceEl = document.getElementById('dash-balance');
    if (incomeEl) incomeEl.innerText = `$${income.toFixed(2)}`;
    if (expenseEl) expenseEl.innerText = `$${expense.toFixed(2)}`;
    if (balanceEl) balanceEl.innerText = `$${(income - expense).toFixed(2)}`;
}

function renderTransactions() {
    const container = document.getElementById('full-tx-list');
    if (!container) return;
    container.innerHTML = '';
    const pinned = transactions.filter(t => t.isPinned).sort((a,b) => new Date(b.date) - new Date(a.date));
    const others = transactions.filter(t => !t.isPinned).sort((a,b) => new Date(b.date) - new Date(a.date));
    [...pinned, ...others].forEach(tx => container.appendChild(createTxEl(tx)));
    lucide.createIcons();
}

function createTxEl(tx) {
    const cat = CATEGORIES[tx.type].find(c => c.id === tx.categoryId) || CATEGORIES[tx.type][0];
    const div = document.createElement('div');
    div.className = `tx-item ${tx.isPinned ? 'pinned' : ''}`;
    div.innerHTML = `
        <div class="tx-info">
            <div class="tx-icon ${tx.type}"><i data-lucide="${cat.icon}"></i></div>
            <div class="tx-details">
                <h5>${tx.note || cat.label} ${tx.isPinned ? '📌' : ''}</h5>
                <p>${cat.label} • ${new Date(tx.date).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="flex-row items-center gap-4">
            <span class="tx-amount ${tx.type === 'income' ? 'text-green' : 'text-primary'}">${tx.type==='income'?'+':'-'}$${tx.amount.toFixed(2)}</span>
            <button class="icon-btn" onclick="openModal('${tx.id}')"><i data-lucide="edit-2"></i></button>
            <button class="icon-btn" onclick="deleteTransaction('${tx.id}')"><i data-lucide="trash-2"></i></button>
        </div>
    `;
    return div;
}

window.deleteTransaction = async (id) => {
    if (!confirm('Delete this transaction?')) return;
    await dbDelete('transactions', id);
    await loadData();
    renderAll();
};

// --- Modal Handlers ---
window.openModal = async (id = null) => {
    const modal = document.getElementById('tx-modal');
    const form = document.getElementById('tx-form');
    form.reset();
    document.getElementById('tx-id').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('image-preview').classList.add('hidden');
    document.querySelector('.drop-zone-prompt').classList.remove('hidden');

    if (id) {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
            document.getElementById('tx-id').value = tx.id;
            document.getElementById(`type-${tx.type}`).checked = true;
            document.getElementById('tx-amount').value = tx.amount;
            updateCategories();
            document.getElementById('tx-category').value = tx.categoryId;
            document.getElementById('tx-date').value = tx.date;
            document.getElementById('tx-note').value = tx.note;
            document.getElementById('tx-recurring').checked = tx.isRecurring;
            document.getElementById('tx-pinned').checked = tx.isPinned;
            if (tx.image) {
                const preview = document.getElementById('image-preview');
                preview.innerHTML = `<img src="${tx.image}">`;
                preview.classList.remove('hidden');
                document.querySelector('.drop-zone-prompt').classList.add('hidden');
            }
        }
    }
    modal.classList.remove('hidden');
    lucide.createIcons();
};

window.closeModal = () => document.getElementById('tx-modal').classList.add('hidden');

function renderRecent() {
    const container = document.getElementById('recent-list');
    if(!container) return;
    container.innerHTML = '';
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sorted.slice(0, 5).forEach(tx => container.appendChild(createTxEl(tx)));
    lucide.createIcons();
}

window.updateCategories = function() {
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const select = document.getElementById('tx-category');
    select.innerHTML = CATEGORIES[type].map(c => `<option value="${c.id}">${c.label}</option>`).join('');
};

function setupDropZone() {
    const dz = document.getElementById('drop-zone');
    if (!dz) return;
    const input = document.getElementById('tx-image');
    dz.addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => handleFiles(e.target.files));
    dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('active'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('active'));
    dz.addEventListener('drop', (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
}

function handleFiles(files) {
    const file = files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('image-preview');
            preview.innerHTML = `<img src="${e.target.result}">`;
            preview.classList.remove('hidden');
            document.querySelector('.drop-zone-prompt').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// --- Tutorial logic ---
function startTutorial() {
    currentTutorialStep = 0;
    showTutorialStep();
    document.getElementById('tutorial-overlay').classList.remove('hidden');
}
function showTutorialStep() {
    const step = TUTORIAL_STEPS[currentTutorialStep];
    document.getElementById('tutorial-title').innerText = step.title;
    document.getElementById('tutorial-text').innerText = step.text;
}
function nextTutorialStep() {
    currentTutorialStep++;
    if (currentTutorialStep >= TUTORIAL_STEPS.length) endTutorial();
    else showTutorialStep();
}
function endTutorial() {
    document.getElementById('tutorial-overlay').classList.add('hidden');
    settings.tutorialCompleted = true;
    saveSettings();
}

window.toggleTheme = toggleTheme;
window.switchView = switchView;

function updateGoalsProgress() {
    goals.forEach(g => {
        const linked = transactions.filter(t => t.goalId === g.id);
        const total = linked.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
        g.currentProgress = total;
    });
}

function drawBalanceTrees() {
    const container = document.getElementById('balance-trees');
    if (!container) return;
    const balance = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
    const treeCount = Math.min(20, Math.floor(balance / 50)); 
    
    container.innerHTML = '';
    for (let i = 0; i < treeCount; i++) {
        const tree = document.createElement('div');
        tree.className = 'tree fade-in';
        tree.innerHTML = '🌲';
        tree.style.position = 'absolute';
        tree.style.bottom = '0';
        tree.style.left = `${Math.random() * 95}%`;
        tree.style.fontSize = `${12 + Math.random() * 24}px`;
        tree.style.opacity = '0.6';
        tree.style.transition = 'all 0.5s ease';
        container.appendChild(tree);
    }
}


