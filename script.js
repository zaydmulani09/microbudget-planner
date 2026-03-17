// Data State
let transactions = [];
let remindersEnabled = false;

// Categories
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

import { createNoise2D } from 'simplex-noise';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initWaves();
    loadData();
    setupEventListeners();
    renderAll();
    checkReminders();
    
    // Set default date to today
    document.getElementById('tx-date').valueAsDate = new Date();
    updateCategories();
});

// --- Waves Background Logic ---
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

    window.addEventListener('resize', () => {
        pT_setSize();
        pT_setLines();
    });
    
    window.addEventListener('mousemove', (e) => {
        pT_updateMousePosition(e.pageX, e.pageY);
    });

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
    const width = rect.width;
    const height = rect.height;
    
    pT_lines = [];
    pT_paths.forEach(path => path.remove());
    pT_paths = [];

    const xGap = 8;
    const yGap = 8;
    const oWidth = width + 200;
    const oHeight = height + 30;

    const totalLines = Math.ceil(oWidth / xGap);
    const totalPoints = Math.ceil(oHeight / yGap);

    const xStart = (width - xGap * totalLines) / 2;
    const yStart = (height - yGap * totalPoints) / 2;

    for (let i = 0; i < totalLines; i++) {
        const points = [];
        for (let j = 0; j < totalPoints; j++) {
            points.push({
                x: xStart + xGap * i,
                y: yStart + yGap * j,
                wave: { x: 0, y: 0 },
                cursor: { x: 0, y: 0, vx: 0, vy: 0 },
            });
        }

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('a__line', 'js-line');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#ffffff'); // white lines
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
        pT_mouse.sx = pT_mouse.x;
        pT_mouse.sy = pT_mouse.y;
        pT_mouse.lx = pT_mouse.x;
        pT_mouse.ly = pT_mouse.y;
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

            const dx = p.x - pT_mouse.sx;
            const dy = p.y - pT_mouse.sy;
            const d = Math.hypot(dx, dy);
            const l = Math.max(175, pT_mouse.vs);

            if (d < l) {
                const s = 1 - d / l;
                const f = Math.cos(d * 0.001) * s;
                p.cursor.vx += Math.cos(pT_mouse.a) * f * l * pT_mouse.vs * 0.00035;
                p.cursor.vy += Math.sin(pT_mouse.a) * f * l * pT_mouse.vs * 0.00035;
            }

            p.cursor.vx += (0 - p.cursor.x) * 0.01;
            p.cursor.vy += (0 - p.cursor.y) * 0.01;
            p.cursor.vx *= 0.95;
            p.cursor.vy *= 0.95;
            p.cursor.x += p.cursor.vx;
            p.cursor.y += p.cursor.vy;
            p.cursor.x = Math.min(50, Math.max(-50, p.cursor.x));
            p.cursor.y = Math.min(50, Math.max(-50, p.cursor.y));
        });
    });
}

function pT_moved(point, withCursorForce = true) {
    return {
        x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
        y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0),
    };
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

    const dx = pT_mouse.x - pT_mouse.lx;
    const dy = pT_mouse.y - pT_mouse.ly;
    const d = Math.hypot(dx, dy);

    pT_mouse.v = d;
    pT_mouse.vs += (d - pT_mouse.vs) * 0.1;
    pT_mouse.vs = Math.min(100, pT_mouse.vs);
    pT_mouse.lx = pT_mouse.x;
    pT_mouse.ly = pT_mouse.y;
    pT_mouse.a = Math.atan2(dy, dx);

    if (pT_container) {
        pT_container.style.setProperty('--x', `${pT_mouse.sx}px`);
        pT_container.style.setProperty('--y', `${pT_mouse.sy}px`);
    }

    pT_movePoints(time);
    pT_drawLines();

    pT_raf = requestAnimationFrame(pT_tick);
}
// ------------------------------

function loadData() {
    const saved = localStorage.getItem('mb_transactions');
    if (saved) {
        transactions = JSON.parse(saved);
        // Ensure dates are parsed correctly
        transactions.forEach(t => t.date = new Date(t.date).toISOString().split('T')[0]);
    }
    const settings = localStorage.getItem('mb_settings');
    if (settings) {
        const parsed = JSON.parse(settings);
        remindersEnabled = parsed.reminders || false;
        document.getElementById('reminder-toggle').checked = remindersEnabled;
    }
}

function saveData() {
    localStorage.setItem('mb_transactions', JSON.stringify(transactions));
    localStorage.setItem('mb_settings', JSON.stringify({ reminders: remindersEnabled }));
}

// Navigation
function setupEventListeners() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            // use closest in case they click the icon inside the button
            const targetBtn = e.target.closest('.nav-btn');
            targetBtn.classList.add('active');
            switchView(targetBtn.dataset.view);
        });
    });
}

function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    if (viewId === 'dashboard') drawChart();
}

// Modal Logic
function openModal(txId = null) {
    const modal = document.getElementById('tx-modal');
    modal.classList.remove('hidden');
    
    if (txId) {
        const tx = transactions.find(t => t.id === txId);
        if (tx) {
            document.getElementById('modal-title').innerText = 'Edit Transaction';
            document.getElementById('tx-id').value = tx.id;
            document.querySelector(`input[name="tx-type"][value="${tx.type}"]`).checked = true;
            updateCategories();
            document.getElementById('tx-amount').value = tx.amount;
            document.getElementById('tx-category').value = tx.categoryId;
            document.getElementById('tx-date').value = tx.date;
            document.getElementById('tx-note').value = tx.note;
        }
    } else {
        document.getElementById('modal-title').innerText = 'Log Transaction';
        document.getElementById('tx-form').reset();
        document.getElementById('tx-id').value = '';
        document.getElementById('tx-date').valueAsDate = new Date();
        updateCategories();
    }
}

function closeModal() {
    document.getElementById('tx-modal').classList.add('hidden');
}

function updateCategories() {
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const select = document.getElementById('tx-category');
    select.innerHTML = CATEGORIES[type].map(c => 
        `<option value="${c.id}">${c.label}</option>`
    ).join('');
}

// CRUD Operations
function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('tx-id').value;
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const amount = parseFloat(document.getElementById('tx-amount').value);
    const categoryId = document.getElementById('tx-category').value;
    const date = document.getElementById('tx-date').value;
    const note = document.getElementById('tx-note').value;

    const txData = {
        id: id || Date.now().toString(),
        type,
        amount,
        categoryId,
        date,
        note,
        timestamp: id ? transactions.find(t=>t.id===id).timestamp : Date.now()
    };

    if (id) {
        transactions = transactions.map(t => t.id === id ? txData : t);
    } else {
        transactions.push(txData);
    }

    saveData();
    closeModal();
    renderAll();
}

function deleteTransaction(id) {
    if(confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        renderAll();
    }
}

// Rendering
function renderAll() {
    calculateStats();
    renderTransactions(); // Full list
    renderRecent(); // Dashboard list
    drawChart();
}

function calculateStats() {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
    });

    const balance = income - expense;

    document.getElementById('dash-income').innerText = `$${income.toFixed(2)}`;
    document.getElementById('dash-expense').innerText = `$${expense.toFixed(2)}`;
    document.getElementById('dash-balance').innerText = `$${balance.toFixed(2)}`;
}

function getCategoryDetails(type, id) {
    return CATEGORIES[type].find(c => c.id === id) || CATEGORIES[type][0];
}

function createTxEl(tx) {
    const cat = getCategoryDetails(tx.type, tx.categoryId);
    const div = document.createElement('div');
    div.className = 'tx-item';
    
    const sign = tx.type === 'income' ? '+' : '-';
    
    div.innerHTML = `
        <div class="tx-info">
            <div class="tx-icon ${tx.type}">
                <i data-lucide="${cat.icon}" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="tx-details">
                <h5>${tx.note || cat.label}</h5>
                <p>${cat.label} • ${new Date(tx.date).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="flex-row items-center gap-4">
            <span class="tx-amount ${tx.type === 'income' ? 'text-green' : 'text-primary'}">${sign}$${tx.amount.toFixed(2)}</span>
            <div class="actions ml-4">
                <button class="icon-btn text-muted" onclick="openModal('${tx.id}')">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
    `;
    return div;
}

function renderRecent() {
    const container = document.getElementById('recent-list');
    container.innerHTML = '';
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-sm text-muted py-4 text-center">No transactions yet. Add one!</p>';
        return;
    }

    // sort by date desc
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    sorted.forEach(tx => {
        container.appendChild(createTxEl(tx));
    });
    lucide.createIcons();
}

function renderTransactions() {
    const container = document.getElementById('full-tx-list');
    const searchTerm = document.getElementById('tx-search') ? document.getElementById('tx-search').value.toLowerCase() : '';
    const filterType = document.getElementById('tx-filter') ? document.getElementById('tx-filter').value : 'all';

    container.innerHTML = '';

    let filtered = transactions.filter(t => {
        const cat = getCategoryDetails(t.type, t.categoryId);
        const matchesSearch = (t.note || '').toLowerCase().includes(searchTerm) || cat.label.toLowerCase().includes(searchTerm);
        const matchesType = filterType === 'all' || t.type === filterType;
        return matchesSearch && matchesType;
    });

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-muted py-8 text-center">No transactions found.</p>';
        return;
    }

    filtered.forEach(tx => {
        container.appendChild(createTxEl(tx));
    });
    lucide.createIcons();
}

// Chart functionality using Canvas API directly
function drawChart() {
    const canvas = document.getElementById('expense-chart');
    if (!canvas) return;
    
    // Setup for high DPI
    const size = 250;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const scale = window.devicePixelRatio || 1;
    canvas.width = size * scale;
    canvas.height = size * scale;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, size, size);

    const expenses = transactions.filter(t => t.type === 'expense');
    if (expenses.length === 0) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No expenses yet', size/2, size/2);
        return;
    }

    const catTotals = {};
    let total = 0;
    expenses.forEach(t => {
        catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
        total += t.amount;
    });

    const cx = size/2;
    const cy = size/2;
    const radius = size * 0.4;
    const innerRadius = size * 0.25;

    let startAngle = -0.5 * Math.PI;

    Object.entries(catTotals).forEach(([catId, amount]) => {
        const sliceAngle = (amount / total) * 2 * Math.PI;
        const cat = getCategoryDetails('expense', catId);
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
        ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = cat.color;
        ctx.fill();
        
        startAngle += sliceAngle;
    });
}

// Settings
function toggleReminders(enabled) {
    remindersEnabled = enabled;
    saveData();
    if(enabled) {
        checkReminders();
    }
}

function checkReminders() {
    if (!remindersEnabled) return;
    
    const today = new Date();
    // 5 = Friday
    if (today.getDay() === 5) {
        // Simple built-in notification if browser supports
        if ("Notification" in window) {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("MicroBudget Planner", {
                        body: "It's Friday! Time to log your weekly expenses."
                    });
                }
            });
        }
    }
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "microbudget_export.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                transactions = data;
                saveData();
                renderAll();
                alert('Data imported successfully!');
            }
        } catch (err) {
            alert('Invalid JSON file.');
        }
    };
    reader.readAsText(file);
}

function clearData() {
    if(confirm('Are you sure you want to delete ALL data? This cannot be undone.')) {
        transactions = [];
        saveData();
        renderAll();
    }
}
