(() => {
  // node_modules/simplex-noise/dist/esm/simplex-noise.js
  var SQRT3 = /* @__PURE__ */ Math.sqrt(3);
  var SQRT5 = /* @__PURE__ */ Math.sqrt(5);
  var F2 = 0.5 * (SQRT3 - 1);
  var G2 = (3 - SQRT3) / 6;
  var F3 = 1 / 3;
  var G3 = 1 / 6;
  var F4 = (SQRT5 - 1) / 4;
  var G4 = (5 - SQRT5) / 20;
  var fastFloor = (x) => Math.floor(x) | 0;
  var grad2 = /* @__PURE__ */ new Float64Array([
    1,
    1,
    -1,
    1,
    1,
    -1,
    -1,
    -1,
    1,
    0,
    -1,
    0,
    1,
    0,
    -1,
    0,
    0,
    1,
    0,
    -1,
    0,
    1,
    0,
    -1
  ]);
  function createNoise2D(random = Math.random) {
    const perm = buildPermutationTable(random);
    const permGrad2x = new Float64Array(perm).map((v) => grad2[v % 12 * 2]);
    const permGrad2y = new Float64Array(perm).map((v) => grad2[v % 12 * 2 + 1]);
    return function noise2D(x, y) {
      let n0 = 0;
      let n1 = 0;
      let n2 = 0;
      const s = (x + y) * F2;
      const i = fastFloor(x + s);
      const j = fastFloor(y + s);
      const t = (i + j) * G2;
      const X0 = i - t;
      const Y0 = j - t;
      const x0 = x - X0;
      const y0 = y - Y0;
      let i1, j1;
      if (x0 > y0) {
        i1 = 1;
        j1 = 0;
      } else {
        i1 = 0;
        j1 = 1;
      }
      const x1 = x0 - i1 + G2;
      const y1 = y0 - j1 + G2;
      const x2 = x0 - 1 + 2 * G2;
      const y2 = y0 - 1 + 2 * G2;
      const ii = i & 255;
      const jj = j & 255;
      let t0 = 0.5 - x0 * x0 - y0 * y0;
      if (t0 >= 0) {
        const gi0 = ii + perm[jj];
        const g0x = permGrad2x[gi0];
        const g0y = permGrad2y[gi0];
        t0 *= t0;
        n0 = t0 * t0 * (g0x * x0 + g0y * y0);
      }
      let t1 = 0.5 - x1 * x1 - y1 * y1;
      if (t1 >= 0) {
        const gi1 = ii + i1 + perm[jj + j1];
        const g1x = permGrad2x[gi1];
        const g1y = permGrad2y[gi1];
        t1 *= t1;
        n1 = t1 * t1 * (g1x * x1 + g1y * y1);
      }
      let t2 = 0.5 - x2 * x2 - y2 * y2;
      if (t2 >= 0) {
        const gi2 = ii + 1 + perm[jj + 1];
        const g2x = permGrad2x[gi2];
        const g2y = permGrad2y[gi2];
        t2 *= t2;
        n2 = t2 * t2 * (g2x * x2 + g2y * y2);
      }
      return 70 * (n0 + n1 + n2);
    };
  }
  function buildPermutationTable(random) {
    const tableSize = 512;
    const p = new Uint8Array(tableSize);
    for (let i = 0; i < tableSize / 2; i++) {
      p[i] = i;
    }
    for (let i = 0; i < tableSize / 2 - 1; i++) {
      const r = i + ~~(random() * (256 - i));
      const aux = p[i];
      p[i] = p[r];
      p[r] = aux;
    }
    for (let i = 256; i < tableSize; i++) {
      p[i] = p[i - 256];
    }
    return p;
  }

  // script.js
  var transactions = [];
  var goals = [];
  var badges = [];
  var currentTutorialStep = 0;
  var settings = {
    theme: "dark",
    reminders: false,
    tutorialCompleted: false,
    lastLogin: null,
    streak: 0
  };
  var CATEGORIES = {
    expense: [
      { id: "food", icon: "utensils", label: "Food & Dining", color: "#ef4444" },
      { id: "transport", icon: "car", label: "Transportation", color: "#f59e0b" },
      { id: "shopping", icon: "shopping-bag", label: "Shopping", color: "#ec4899" },
      { id: "bills", icon: "file-text", label: "Bills & Utilities", color: "#8b5cf6" },
      { id: "entertainment", icon: "gamepad-2", label: "Entertainment", color: "#3b82f6" },
      { id: "other", icon: "more-horizontal", label: "Other", color: "#64748b" }
    ],
    income: [
      { id: "salary", icon: "briefcase", label: "Salary", color: "#10b981" },
      { id: "gift", icon: "gift", label: "Gift", color: "#f43f5e" },
      { id: "transfer", icon: "repeat", label: "Transfer", color: "#0ea5e9" },
      { id: "other_income", icon: "plus-circle", label: "Other Income", color: "#64748b" }
    ]
  };
  var BADGES_CONFIG = [
    { id: "first_tx", label: "First Step", icon: "star", description: "Log your first transaction" },
    { id: "streak_3", label: "Triple Threat", icon: "flame", description: "3 day logging streak" },
    { id: "goal_met", icon: "target", label: "Visionary", description: "Complete your first goal" },
    { id: "big_saver", icon: "shield-check", label: "Grand Master", description: "Save over $1000" }
  ];
  var TUTORIAL_STEPS = [
    { title: "Welcome to V2", text: "MicroBudget is now more powerful. We've added goals, streaks, and receipt tracking!" },
    { title: "Navigation", text: "Use the sidebar to explore your Ledger, Goals, and Achievement milestones." },
    { title: "The FAB", text: "Click the floating '+' button to log transactions, set recurring rules, or upload receipts." }
  ];
  var dbName = "MicroBudgetDB";
  var db;
  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 3);
      request.onupgradeneeded = (e) => {
        const db2 = e.target.result;
        if (!db2.objectStoreNames.contains("transactions")) db2.createObjectStore("transactions", { keyPath: "id" });
        if (!db2.objectStoreNames.contains("goals")) db2.createObjectStore("goals", { keyPath: "id" });
        if (!db2.objectStoreNames.contains("settings")) db2.createObjectStore("settings", { keyPath: "id" });
        if (!db2.objectStoreNames.contains("badges")) db2.createObjectStore("badges", { keyPath: "id" });
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
  document.addEventListener("DOMContentLoaded", async () => {
    await initDB();
    await loadData();
    lucide.createIcons();
    initWaves();
    setupEventListeners();
    setupTheming();
    setupDropZone();
    renderAll();
    checkStreaks();
    checkRecurring();
    if (!settings.tutorialCompleted) startTutorial();
    document.getElementById("tx-date").valueAsDate = /* @__PURE__ */ new Date();
    updateCategories();
  });
  async function loadData() {
    transactions = await dbGetAll("transactions");
    goals = await dbGetAll("goals");
    badges = await dbGetAll("badges");
    const savedSettings = await dbGet("settings", "app_settings");
    if (savedSettings) {
      settings = { ...settings, ...savedSettings };
      document.getElementById("reminder-toggle").checked = settings.reminders;
    }
  }
  async function saveSettings() {
    await dbPut("settings", { id: "app_settings", ...settings });
  }
  function setupTheming() {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }
  function toggleTheme() {
    settings.theme = settings.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", settings.theme);
    saveSettings();
  }
  var pT_noise2D = null;
  var pT_container = null;
  var pT_svg = null;
  var pT_pointer = null;
  var pT_mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };
  var pT_paths = [];
  var pT_lines = [];
  var pT_raf = null;
  function initWaves() {
    pT_container = document.getElementById("waves-bg");
    pT_svg = document.getElementById("waves-svg");
    pT_pointer = document.getElementById("waves-pointer");
    if (!pT_container || !pT_svg) return;
    pT_noise2D = createNoise2D();
    pT_setSize();
    pT_setLines();
    window.addEventListener("resize", () => {
      pT_setSize();
      pT_setLines();
    });
    window.addEventListener("mousemove", (e) => {
      pT_updateMousePosition(e.pageX, e.pageY);
    });
    pT_container.addEventListener("touchmove", (e) => {
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
    pT_paths.forEach((path) => path.remove());
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
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.classList.add("a__line", "js-line");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "#ffffff");
      path.setAttribute("stroke-width", "1");
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
    pT_container.style.setProperty("--x", `${pT_mouse.sx}px`);
    pT_container.style.setProperty("--y", `${pT_mouse.sy}px`);
  }
  function pT_movePoints(time) {
    if (!pT_noise2D) return;
    pT_lines.forEach((points) => {
      points.forEach((p) => {
        const move = pT_noise2D((p.x + time * 8e-3) * 3e-3, (p.y + time * 3e-3) * 2e-3) * 8;
        p.wave.x = Math.cos(move) * 12;
        p.wave.y = Math.sin(move) * 6;
        const dx = p.x - pT_mouse.sx, dy = p.y - pT_mouse.sy, d = Math.hypot(dx, dy), l = Math.max(175, pT_mouse.vs);
        if (d < l) {
          const s = 1 - d / l, f = Math.cos(d * 1e-3) * s;
          p.cursor.vx += Math.cos(pT_mouse.a) * f * l * pT_mouse.vs * 35e-5;
          p.cursor.vy += Math.sin(pT_mouse.a) * f * l * pT_mouse.vs * 35e-5;
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
      pT_paths[lIndex].setAttribute("d", d);
    });
  }
  function pT_tick(time) {
    pT_mouse.sx += (pT_mouse.x - pT_mouse.sx) * 0.1;
    pT_mouse.sy += (pT_mouse.y - pT_mouse.sy) * 0.1;
    const dx = pT_mouse.x - pT_mouse.lx, dy = pT_mouse.y - pT_mouse.ly, d = Math.hypot(dx, dy);
    pT_mouse.v = d;
    pT_mouse.vs += (d - pT_mouse.vs) * 0.1;
    pT_mouse.vs = Math.min(100, pT_mouse.vs);
    pT_mouse.lx = pT_mouse.x;
    pT_mouse.ly = pT_mouse.y;
    pT_mouse.a = Math.atan2(dy, dx);
    pT_movePoints(time);
    pT_drawLines();
    pT_raf = requestAnimationFrame(pT_tick);
  }
  function setupEventListeners() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
        const targetBtn = e.target.closest(".nav-btn");
        targetBtn.classList.add("active");
        switchView(targetBtn.dataset.view);
      });
    });
    document.getElementById("tx-form").addEventListener("submit", handleFormSubmit);
    document.getElementById("tutorial-next").addEventListener("click", nextTutorialStep);
    document.getElementById("tutorial-skip").addEventListener("click", endTutorial);
    const reminderToggle = document.getElementById("reminder-toggle");
    if (reminderToggle) reminderToggle.addEventListener("change", (e) => {
      settings.reminders = e.target.checked;
      saveSettings();
    });
  }
  function switchView(viewId) {
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    const target = document.getElementById(`view-${viewId}`);
    if (target) target.classList.remove("hidden");
    if (viewId === "dashboard") drawChart();
    if (viewId === "goals") renderGoals();
    if (viewId === "achievements") renderAchievements();
  }
  async function handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("tx-id").value || Date.now().toString();
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const amount = parseFloat(document.getElementById("tx-amount").value);
    const categoryId = document.getElementById("tx-category").value;
    const date = document.getElementById("tx-date").value;
    const note = document.getElementById("tx-note").value;
    const isRecurring = document.getElementById("tx-recurring").checked;
    const isPinned = document.getElementById("tx-pinned").checked;
    const previewImg = document.querySelector("#image-preview img");
    const image = previewImg ? previewImg.src : null;
    const txData = { id, type, amount, categoryId, date, note, isRecurring, isPinned, image, timestamp: Date.now() };
    await dbPut("transactions", txData);
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
  }
  function calculateStats() {
    let income = 0, expense = 0;
    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") expense += t.amount;
    });
    document.getElementById("dash-income").innerText = `$${income.toFixed(2)}`;
    document.getElementById("dash-expense").innerText = `$${expense.toFixed(2)}`;
    document.getElementById("dash-balance").innerText = `$${(income - expense).toFixed(2)}`;
  }
  function renderTransactions() {
    const container = document.getElementById("full-tx-list");
    if (!container) return;
    container.innerHTML = "";
    const pinned = transactions.filter((t) => t.isPinned).sort((a, b) => new Date(b.date) - new Date(a.date));
    const others = transactions.filter((t) => !t.isPinned).sort((a, b) => new Date(b.date) - new Date(a.date));
    [...pinned, ...others].forEach((tx) => container.appendChild(createTxEl(tx)));
    lucide.createIcons();
  }
  function createTxEl(tx) {
    const cat = CATEGORIES[tx.type].find((c) => c.id === tx.categoryId) || CATEGORIES[tx.type][0];
    const div = document.createElement("div");
    div.className = `tx-item ${tx.isPinned ? "pinned" : ""}`;
    div.innerHTML = `
        <div class="tx-info">
            <div class="tx-icon ${tx.type}"><i data-lucide="${cat.icon}"></i></div>
            <div class="tx-details">
                <h5>${tx.note || cat.label} ${tx.isPinned ? "\u{1F4CC}" : ""}</h5>
                <p>${cat.label} \u2022 ${new Date(tx.date).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="flex-row items-center gap-4">
            <span class="tx-amount ${tx.type === "income" ? "text-green" : "text-primary"}">${tx.type === "income" ? "+" : "-"}$${tx.amount.toFixed(2)}</span>
            <button class="icon-btn" onclick="openModal('${tx.id}')"><i data-lucide="edit-2"></i></button>
        </div>
    `;
    return div;
  }
  function checkStreaks() {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    if (settings.lastLogin !== today) {
      const yesterday = new Date(Date.now() - 864e5).toDateString();
      if (settings.lastLogin === yesterday) settings.streak++;
      else settings.streak = 1;
      settings.lastLogin = today;
      saveSettings();
    }
  }
  function renderAchievements() {
    document.getElementById("streak-count").innerText = `${settings.streak} Day Streak`;
    const container = document.getElementById("badges-list");
    container.innerHTML = BADGES_CONFIG.map((b) => `
        <div class="badge-item ${badges.find((ub) => ub.id === b.id) ? "unlocked" : ""}">
            <div class="badge-icon"><i data-lucide="${b.icon}"></i></div>
            <p class="text-xs font-bold">${b.label}</p>
        </div>
    `).join("");
    lucide.createIcons();
  }
  async function unlockBadge(id) {
    if (badges.find((b) => b.id === id)) return;
    const badge = BADGES_CONFIG.find((b) => b.id === id);
    await dbPut("badges", { id, unlockedAt: Date.now() });
    badges.push({ id });
    alert(`Achievement Unlocked: ${badge.label}!`);
  }
  function checkBadges() {
    if (transactions.length >= 1) unlockBadge("first_tx");
    if (settings.streak >= 3) unlockBadge("streak_3");
  }
  async function checkRecurring() {
  }
  function setupDropZone() {
    const dz = document.getElementById("drop-zone");
    if (!dz) return;
    const input = document.getElementById("tx-image");
    dz.addEventListener("click", () => input.click());
    input.addEventListener("change", (e) => handleFiles(e.target.files));
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("active");
    });
    dz.addEventListener("dragleave", () => dz.classList.remove("active"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    });
  }
  function handleFiles(files) {
    const file = files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = document.getElementById("image-preview");
        preview.innerHTML = `<img src="${e.target.result}">`;
        preview.classList.remove("hidden");
        document.querySelector(".drop-zone-prompt").classList.add("hidden");
      };
      reader.readAsDataURL(file);
    }
  }
  function startTutorial() {
    currentTutorialStep = 0;
    showTutorialStep();
    document.getElementById("tutorial-overlay").classList.remove("hidden");
  }
  function showTutorialStep() {
    const step = TUTORIAL_STEPS[currentTutorialStep];
    document.getElementById("tutorial-title").innerText = step.title;
    document.getElementById("tutorial-text").innerText = step.text;
  }
  function nextTutorialStep() {
    currentTutorialStep++;
    if (currentTutorialStep >= TUTORIAL_STEPS.length) endTutorial();
    else showTutorialStep();
  }
  function endTutorial() {
    document.getElementById("tutorial-overlay").classList.add("hidden");
    settings.tutorialCompleted = true;
    saveSettings();
  }
  function drawChart() {
    const canvas = document.getElementById("expense-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const expenses = transactions.filter((t) => t.type === "expense");
    if (!expenses.length) return;
    const animate = () => {
      if (canvas.offsetParent === null) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }
  window.openModal = function(id = null) {
    document.getElementById("tx-modal").classList.remove("hidden");
  };
  window.closeModal = function() {
    document.getElementById("tx-modal").classList.add("hidden");
  };
  window.renderRecent = function() {
    const container = document.getElementById("recent-list");
    if (!container) return;
    container.innerHTML = "";
    transactions.slice(0, 5).forEach((tx) => container.appendChild(createTxEl(tx)));
    lucide.createIcons();
  };
  window.updateCategories = function() {
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const select = document.getElementById("tx-category");
    select.innerHTML = CATEGORIES[type].map((c) => `<option value="${c.id}">${c.label}</option>`).join("");
  };
  window.switchView = switchView;
  window.toggleTheme = toggleTheme;
  function renderGoals() {
    const container = document.getElementById("goals-list");
    container.innerHTML = `
        <div class="bento-card glass-panel goal-card">
            <h4>House Savings</h4>
            <div class="goal-progress-container"><div class="goal-progress-fill" style="width: 45%;"></div></div>
            <p class="text-xs text-muted">$4,500 / $10,000</p>
        </div>
        <div class="bento-card glass-panel goal-card flex-center cursor-pointer" onclick="alert('Goal creation coming in next minor update!')">
            <i data-lucide="plus" style="width: 40px; height: 40px; opacity: 0.2;"></i>
        </div>
    `;
    lucide.createIcons();
  }
  function updateGoalsProgress() {
  }
})();
