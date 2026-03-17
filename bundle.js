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
  var remindersEnabled = false;
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
  document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    initWaves();
    loadData();
    setupEventListeners();
    renderAll();
    checkReminders();
    document.getElementById("tx-date").valueAsDate = /* @__PURE__ */ new Date();
    updateCategories();
  });
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
    const width = rect.width;
    const height = rect.height;
    pT_lines = [];
    pT_paths.forEach((path) => path.remove());
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
          cursor: { x: 0, y: 0, vx: 0, vy: 0 }
        });
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
      pT_mouse.sx = pT_mouse.x;
      pT_mouse.sy = pT_mouse.y;
      pT_mouse.lx = pT_mouse.x;
      pT_mouse.ly = pT_mouse.y;
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
        const dx = p.x - pT_mouse.sx;
        const dy = p.y - pT_mouse.sy;
        const d = Math.hypot(dx, dy);
        const l = Math.max(175, pT_mouse.vs);
        if (d < l) {
          const s = 1 - d / l;
          const f = Math.cos(d * 1e-3) * s;
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
    return {
      x: point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0),
      y: point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0)
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
      pT_paths[lIndex].setAttribute("d", d);
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
      pT_container.style.setProperty("--x", `${pT_mouse.sx}px`);
      pT_container.style.setProperty("--y", `${pT_mouse.sy}px`);
    }
    pT_movePoints(time);
    pT_drawLines();
    pT_raf = requestAnimationFrame(pT_tick);
  }
  function loadData() {
    const saved = localStorage.getItem("mb_transactions");
    if (saved) {
      transactions = JSON.parse(saved);
      transactions.forEach((t) => t.date = new Date(t.date).toISOString().split("T")[0]);
    }
    const settings = localStorage.getItem("mb_settings");
    if (settings) {
      const parsed = JSON.parse(settings);
      remindersEnabled = parsed.reminders || false;
      document.getElementById("reminder-toggle").checked = remindersEnabled;
    }
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
  }
  function switchView(viewId) {
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    document.getElementById(`view-${viewId}`).classList.remove("hidden");
    if (viewId === "dashboard") drawChart();
  }
  function updateCategories() {
    const type = document.querySelector('input[name="tx-type"]:checked').value;
    const select = document.getElementById("tx-category");
    select.innerHTML = CATEGORIES[type].map(
      (c) => `<option value="${c.id}">${c.label}</option>`
    ).join("");
  }
  function renderAll() {
    calculateStats();
    renderTransactions();
    renderRecent();
    drawChart();
  }
  function calculateStats() {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") expense += t.amount;
    });
    const balance = income - expense;
    document.getElementById("dash-income").innerText = `$${income.toFixed(2)}`;
    document.getElementById("dash-expense").innerText = `$${expense.toFixed(2)}`;
    document.getElementById("dash-balance").innerText = `$${balance.toFixed(2)}`;
  }
  function getCategoryDetails(type, id) {
    return CATEGORIES[type].find((c) => c.id === id) || CATEGORIES[type][0];
  }
  function createTxEl(tx) {
    const cat = getCategoryDetails(tx.type, tx.categoryId);
    const div = document.createElement("div");
    div.className = "tx-item";
    const sign = tx.type === "income" ? "+" : "-";
    div.innerHTML = `
        <div class="tx-info">
            <div class="tx-icon ${tx.type}">
                <i data-lucide="${cat.icon}" style="width: 20px; height: 20px;"></i>
            </div>
            <div class="tx-details">
                <h5>${tx.note || cat.label}</h5>
                <p>${cat.label} \u2022 ${new Date(tx.date).toLocaleDateString()}</p>
            </div>
        </div>
        <div class="flex-row items-center gap-4">
            <span class="tx-amount ${tx.type === "income" ? "text-green" : "text-primary"}">${sign}$${tx.amount.toFixed(2)}</span>
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
    const container = document.getElementById("recent-list");
    container.innerHTML = "";
    if (transactions.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted py-4 text-center">No transactions yet. Add one!</p>';
      return;
    }
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    sorted.forEach((tx) => {
      container.appendChild(createTxEl(tx));
    });
    lucide.createIcons();
  }
  function renderTransactions() {
    const container = document.getElementById("full-tx-list");
    const searchTerm = document.getElementById("tx-search") ? document.getElementById("tx-search").value.toLowerCase() : "";
    const filterType = document.getElementById("tx-filter") ? document.getElementById("tx-filter").value : "all";
    container.innerHTML = "";
    let filtered = transactions.filter((t) => {
      const cat = getCategoryDetails(t.type, t.categoryId);
      const matchesSearch = (t.note || "").toLowerCase().includes(searchTerm) || cat.label.toLowerCase().includes(searchTerm);
      const matchesType = filterType === "all" || t.type === filterType;
      return matchesSearch && matchesType;
    });
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filtered.length === 0) {
      container.innerHTML = '<p class="text-muted py-8 text-center">No transactions found.</p>';
      return;
    }
    filtered.forEach((tx) => {
      container.appendChild(createTxEl(tx));
    });
    lucide.createIcons();
  }
  function drawChart() {
    const canvas = document.getElementById("expense-chart");
    if (!canvas) return;
    const size = 250;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const scale = window.devicePixelRatio || 1;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, size, size);
    const expenses = transactions.filter((t) => t.type === "expense");
    if (expenses.length === 0) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "14px Inter";
      ctx.textAlign = "center";
      ctx.fillText("No expenses yet", size / 2, size / 2);
      return;
    }
    const catTotals = {};
    let total = 0;
    expenses.forEach((t) => {
      catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
      total += t.amount;
    });
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.4;
    const innerRadius = size * 0.25;
    let startAngle = -0.5 * Math.PI;
    Object.entries(catTotals).forEach(([catId, amount]) => {
      const sliceAngle = amount / total * 2 * Math.PI;
      const cat = getCategoryDetails("expense", catId);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = cat.color;
      ctx.fill();
      startAngle += sliceAngle;
    });
  }
  function checkReminders() {
    if (!remindersEnabled) return;
    const today = /* @__PURE__ */ new Date();
    if (today.getDay() === 5) {
      if ("Notification" in window) {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("MicroBudget Planner", {
              body: "It's Friday! Time to log your weekly expenses."
            });
          }
        });
      }
    }
  }
})();
