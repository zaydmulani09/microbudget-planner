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
    { id: 'first_tx', label: 'First Step', icon: 'star', description: 'Log your first transaction', test: () => transactions.length > 0 },
    { id: 'streak_3', label: 'Triple Threat', icon: 'flame', description: '3 day logging streak', test: () => settings.streak >= 3 },
    { id: 'goal_met', label: 'Visionary', icon: 'target', description: 'Complete your first goal', test: () => goals.some(g => g.currentProgress >= g.target) },
    { id: 'big_saver', label: 'Grand Master', icon: 'shield-check', description: 'Log 50 transactions', test: () => transactions.length >= 50 },
    { id: 'high_roller', label: 'High Roller', icon: 'trending-up', description: 'Single transaction over $1000', test: () => transactions.some(t => t.amount >= 1000) }
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
    initSpaceBackground();
    lucide.createIcons();
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
    // Visual indicator of saved settings
    const saveBtn = document.querySelector('[data-view="settings"]');
    if (saveBtn) {
        spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#10b981');
    }
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

async function checkStreaks() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    if (settings.lastLogin === todayStr) return; // Already logged today
    
    if (settings.lastLogin) {
        const last = new Date(settings.lastLogin);
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            settings.streak++;
        } else if (diffDays > 1) {
            settings.streak = 1;
        }
    } else {
        settings.streak = 1;
    }
    
    settings.lastLogin = todayStr;
    await saveSettings();
    renderAchievements();
}

window.clearData = async () => {
    if (!confirm("⚠️ This will permanently delete ALL your transactions, goals, and settings. Are you sure?")) return;
    
    const stores = ['transactions', 'goals', 'settings', 'badges'];
    const txn = db.transaction(stores, "readwrite");
    stores.forEach(s => txn.objectStore(s).clear());
    
    txn.oncomplete = () => {
        alert("Data cleared successfully.");
        location.reload();
    };
};

async function toggleReminders(enabled) {
    if (enabled && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            const toggle = document.getElementById('reminder-toggle');
            if (toggle) toggle.checked = false;
            return;
        }
    }
    settings.reminders = enabled;
    await saveSettings();
}

// --- Space Background Logic ---
let spaceCanvas, spaceCtx, stars = [], particles = [];
let cursor = { x: 0, y: 0, targetX: 0, targetY: 0 };
let activeGlowParticles = [];

function spawnSparks(x, y, color = '#00f0ff') {
    for (let i = 0; i < 15; i++) {
        activeGlowParticles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            size: Math.random() * 3 + 1,
            life: 1.0,
            color
        });
    }
}

function initSpaceBackground() {
    spaceCanvas = document.getElementById('space-canvas');
    if (!spaceCanvas) return;
    spaceCtx = spaceCanvas.getContext('2d');
    resizeSpaceCanvas();
    window.addEventListener('resize', resizeSpaceCanvas);
    
    // Create Stars
    for (let i = 0; i < 400; i++) {
        stars.push({
            x: Math.random() * spaceCanvas.width,
            y: Math.random() * spaceCanvas.height,
            size: Math.random() * 1.5,
            opacity: Math.random(),
            speed: Math.random() * 0.05
        });
    }
    
    // Create Particles
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * spaceCanvas.width,
            y: Math.random() * spaceCanvas.height,
            size: Math.random() * 2 + 1,
            speedY: Math.random() * 0.5 + 0.2,
            opacity: Math.random() * 0.5 + 0.2
        });
    }
    
    requestAnimationFrame(animateSpace);
}

function resizeSpaceCanvas() {
    spaceCanvas.width = window.innerWidth;
    spaceCanvas.height = window.innerHeight;
}

function animateSpace() {
    spaceCtx.clearRect(0, 0, spaceCanvas.width, spaceCanvas.height);
    
    // Update cursor position for parallax
    cursor.x += (cursor.targetX - cursor.x) * 0.1;
    cursor.y += (cursor.targetY - cursor.y) * 0.1;
    
    // Apply parallax to background elements
    const parallaxLayers = [
         { el: document.querySelector('.aurora-layer'), factor: 0.02 },
         { el: document.querySelector('.grid-floor'), factor: 0.05 },
         { el: spaceCanvas, factor: 0.01 }
    ];
    
    parallaxLayers.forEach(layer => {
        if (layer.el) {
            const tx = cursor.x * layer.factor;
            const ty = cursor.y * layer.factor;
            if (layer.el.classList.contains('grid-floor')) {
                layer.el.style.transform = `rotateX(65deg) translate(${tx}px, ${ty}px)`;
            } else {
                layer.el.style.transform = `translate(${tx}px, ${ty}px)`;
            }
        }
    });

    // Draw Stars
    stars.forEach(star => {
        star.opacity += (Math.random() - 0.5) * 0.02;
        star.opacity = Math.max(0.1, Math.min(1, star.opacity));
        spaceCtx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        spaceCtx.beginPath();
        spaceCtx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        spaceCtx.fill();
    });
    
    // Draw Particles
    particles.forEach(p => {
        p.y -= p.speedY;
        if (p.y < -10) p.y = spaceCanvas.height + 10;
        spaceCtx.fillStyle = `rgba(0, 240, 255, ${p.opacity})`;
        spaceCtx.shadowBlur = 5;
        spaceCtx.shadowColor = 'rgba(0, 240, 255, 0.5)';
        spaceCtx.beginPath();
        spaceCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        spaceCtx.fill();
        spaceCtx.shadowBlur = 0;
    });

    // Draw Sparks
    activeGlowParticles = activeGlowParticles.filter(p => p.life > 0);
    activeGlowParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life -= 0.02;
        spaceCtx.fillStyle = p.color;
        spaceCtx.globalAlpha = Math.max(0, p.life);
        spaceCtx.shadowBlur = 15;
        spaceCtx.shadowColor = p.color;
        spaceCtx.beginPath();
        spaceCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        spaceCtx.fill();
        spaceCtx.globalAlpha = 1;
        spaceCtx.shadowBlur = 0;
    });
    
    requestAnimationFrame(animateSpace);
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

    document.addEventListener('mousemove', (e) => {
        cursor.targetX = (e.clientX - window.innerWidth / 2);
        cursor.targetY = (e.clientY - window.innerHeight / 2);
    });

    // Ripple & Spark Global Listener
    document.addEventListener('mousedown', (e) => {
        const target = e.target.closest('button, .list-item, .tx-item');
        if (!target) return;
        
        // Ripple
        const rect = target.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
        
        // Sparks for primary buttons
        if (target.classList.contains('btn-primary') || target.classList.contains('liquid-button')) {
            spawnSparks(e.clientX, e.clientY, '#00f0ff');
        }
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
         toggleReminders(e.target.checked);
    });

    // Search & Filter Listeners
    const txSearch = document.getElementById('tx-search');
    if (txSearch) txSearch.addEventListener('input', renderTransactions);
    
    const txTypeFilter = document.getElementById('tx-type-filter');
    if (txTypeFilter) txTypeFilter.addEventListener('change', renderTransactions);

    const txCatFilter = document.getElementById('tx-category-filter');
    if (txCatFilter) txCatFilter.addEventListener('change', renderTransactions);

    const txPinFilter = document.getElementById('tx-pin-filter');
    if (txPinFilter) txPinFilter.addEventListener('change', renderTransactions);

    const txSort = document.getElementById('tx-sort');
    if (txSort) txSort.addEventListener('change', renderTransactions);

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.addEventListener('change', toggleTheme);

    const importInput = document.querySelector('input[type="file"][onchange^="importData"]'); 
    // Wait, I removed the onchange, so let's just find it by type and accept
    const fileImport = document.querySelector('input[accept=".json"]');
    if (fileImport) fileImport.addEventListener('change', importData);
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
    
    // 1. Persist to Database
    await dbPut('transactions', txData);
    await loadData(); // Reload global transactions array
    
    // 2. UI Feedback & Cleanup
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        spawnSparks(e.clientX, e.clientY, '#10b981'); // Green for success
        submitBtn.innerHTML = 'Success!';
        setTimeout(() => {
            submitBtn.innerHTML = 'Save Transaction';
            closeModal();
            renderAll();
            checkBadges();
        }, 600);
    } else {
        closeModal();
        renderAll();
        checkBadges();
    }
}

function renderAll() {
    calculateStats();
    populateCategoryFilter();
    renderTransactions();
    renderRecent();
    drawChart();
    updateGoalsProgress();
    drawBalanceTrees();
    renderAchievements();
}

function populateCategoryFilter() {
    const filter = document.getElementById('tx-category-filter');
    if (!filter) return;
    
    // Save current selection
    const currentVal = filter.value;
    
    // Get all unique categories from global config
    const categories = [
        ...CATEGORIES.expense.map(c => ({ ...c, type: 'expense' })),
        ...CATEGORIES.income.map(c => ({ ...c, type: 'income' }))
    ];
    
    filter.innerHTML = '<option value="all">All Categories</option>' + 
        categories.map(c => `<option value="${c.id}">${c.label} (${c.type})</option>`).join('');
    
    filter.value = currentVal || 'all';
}

async function checkBadges() {
    let newlyUnlocked = false;
    for (const badge of BADGES_CONFIG) {
        if (!badges.some(b => b.id === badge.id) && badge.test()) {
            const unlockData = { id: badge.id, unlockedAt: Date.now() };
            await dbPut('badges', unlockData);
            badges.push(unlockData);
            newlyUnlocked = true;
            
            // Trigger effects
            spawnSparks(window.innerWidth / 2, window.innerHeight / 2, '#00f0ff');
            // We could also add a notification here
        }
    }
    if (newlyUnlocked) renderAchievements();
}

function renderAchievements() {
    const container = document.getElementById('badges-list');
    const streakVal = document.getElementById('streak-count');
    if (streakVal) streakVal.innerText = `${settings.streak || 0} Day Streak`;
    if (!container) return;
    
    container.innerHTML = BADGES_CONFIG.map(badge => {
        const isUnlocked = badges.some(b => b.id === badge.id);
        return `
            <div class="badge-item ${isUnlocked ? 'unlocked' : ''}" data-badge="${badge.id}">
                <div class="badge-icon">
                    <i data-lucide="${badge.icon}"></i>
                </div>
                <span class="text-xs">${badge.label}</span>
                <div class="badge-tooltip">
                    <span class="tooltip-title">${badge.label}</span>
                    <p class="tooltip-desc">${badge.description}</p>
                    ${isUnlocked ? '<span class="text-xs text-green" style="margin-top:0.5rem; display:block;">Unlocked!</span>' : ''}
                </div>
            </div>
        `;
    }).join('');
    lucide.createIcons();
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
    
    const searchTerm = document.getElementById('tx-search')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('tx-type-filter')?.value || 'all';
    const catFilter = document.getElementById('tx-category-filter')?.value || 'all';
    const pinFilter = document.getElementById('tx-pin-filter')?.value || 'all';
    const sortVal = document.getElementById('tx-sort')?.value || 'newest';
    
    let filtered = transactions.filter(tx => {
        const cat = CATEGORIES[tx.type].find(c => c.id === tx.categoryId) || { label: '' };
        
        // Search note, category, or amount
        const matchesSearch = 
            (tx.note?.toLowerCase().includes(searchTerm)) || 
            (cat.label.toLowerCase().includes(searchTerm)) || 
            (tx.amount.toString().includes(searchTerm));
            
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;
        const matchesCat = catFilter === 'all' || tx.categoryId === catFilter;
        const matchesPin = pinFilter === 'all' || (pinFilter === 'pinned' ? tx.isPinned : !tx.isPinned);
        
        return matchesSearch && matchesType && matchesCat && matchesPin;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortVal === 'newest') return new Date(b.date) - new Date(a.date);
        if (sortVal === 'oldest') return new Date(a.date) - new Date(b.date);
        if (sortVal === 'highest') return b.amount - a.amount;
        if (sortVal === 'lowest') return a.amount - b.amount;
        return 0;
    });

    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center p-12 opacity-40 fade-in">No transactions found matching your criteria.</div>';
    } else {
        filtered.forEach(tx => container.appendChild(createTxEl(tx)));
    }
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


