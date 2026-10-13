// ===== 0. 載入畫面 =====
// 載入完成後淡出（至少顯示一小段時間，避免一閃而過）
(function () {
  const html = document.documentElement;
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loaderFill");
  const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!loader || noMotion) {           // 系統設定「減少動態效果」時，直接略過
    if (loader) loader.remove();
    html.classList.add("is-loaded");
    return;
  }

  const MIN_SHOW = 1200;               // ✏️ 至少顯示幾毫秒
  const start = performance.now();
  let progress = 0;
  let finished = false;

  // 進度條：慢慢往 90% 靠近，載入完成時才衝到 100%
  const tick = setInterval(() => {
    progress += (90 - progress) * 0.12;
    fill.style.setProperty("--p", progress.toFixed(1) + "%");
  }, 120);

  const finish = () => {
    if (finished) return;
    finished = true;
    const wait = Math.max(0, MIN_SHOW - (performance.now() - start));
    setTimeout(() => {
      clearInterval(tick);
      fill.style.setProperty("--p", "100%");
      setTimeout(() => {
        loader.classList.add("is-done");        // 淡出
        html.classList.add("is-loaded");        // 首頁標題開始進場
        setTimeout(() => loader.remove(), 800);
      }, 350);
    }, wait);
  };

  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish);
  setTimeout(finish, 4000);            // 保險：載入太慢時也會自動結束
})();

// ===== 1. 深色／淺色模式 =====
const root = document.documentElement;
const themeBtn = document.getElementById("themeBtn");

// 讀取上次的選擇；沒有的話就跟著電腦／手機的設定
let savedTheme = null;
try { savedTheme = localStorage.getItem("theme"); } catch (e) {}

const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
  root.setAttribute("data-theme", "dark");
}

function applyTheme(next) {
  if (next === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  try { localStorage.setItem("theme", next); } catch (e) {}
}

themeBtn.addEventListener("click", () => {
  applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

// ===== 2. 手機版選單 =====
const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");

menuBtn.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuBtn.setAttribute("aria-expanded", open);
});

// 點選選單連結後自動收起
nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
  });
});

// ===== 3. 作品列表（資料來自 works.js）與分類篩選 =====
const worksList = document.getElementById("worksList");
const filtersBox = document.getElementById("filters");
const emptyMsg = document.getElementById("emptyMsg");

// 小工具：建立一個元素，可同時設定 class 與文字
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function categoryLabel(key) {
  return CATEGORY_LABELS[key] || key;
}

// 把 "一般文字 **重點** 一般文字" 轉成含螢光筆標記的段落
function richText(text) {
  const p = el("p");
  text.split(/\*\*(.+?)\*\*/g).forEach((part, i) => {
    if (i % 2 === 1) p.append(el("mark", "hl", part));
    else if (part) p.append(document.createTextNode(part));
  });
  return p;
}

// 作品縮圖：有 thumb 就顯示圖片，沒有（或圖片載入失敗）就顯示分類色塊
function buildThumb(w) {
  const placeholder = () => el("div", "work-thumb is-placeholder", categoryLabel(w.category));
  const src = w.thumb || w.image;
  if (!src) return placeholder();

  const img = el("img", "work-thumb");
  img.src = src;
  img.alt = w.title + " 縮圖";
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(placeholder()));
  return img;
}

// 把一筆作品資料變成網頁上的一列
function buildWork(w) {
  const item = el("details", "work");
  item.dataset.category = w.category;

  const summary = el("summary");
  const title = el("span", "work-title", w.title);
  title.dataset.text = w.title; // 讓 CSS 能在文字背後做出模糊光暈
  summary.append(
    title,
    el("span", "work-meta", categoryLabel(w.category) + (w.year ? " ／ " + w.year : ""))
  );

  // 展開後：左邊縮圖、右邊文字
  const body = el("div", "work-body");
  const info = el("div", "work-info");

  if (w.description) info.append(richText(w.description));
  if (w.tags) info.append(el("p", "work-tags", w.tags));

  if (w.links && w.links.length) {
    const links = el("p", "work-links");
    w.links.forEach((l) => {
      const a = el("a", null, l.label);
      a.href = l.url;
      a.target = "_blank";
      a.rel = "noopener";
      links.append(a);
    });
    info.append(links);
  }

  body.append(buildThumb(w), info);
  item.append(summary, body);
  return item;
}

// 依作品資料產生分類按鈕（只顯示有作品的分類）
function buildFilters(list) {
  const used = new Set(list.map((w) => w.category));
  const ordered = Object.keys(CATEGORY_LABELS).filter((k) => used.has(k));
  used.forEach((k) => { if (!ordered.includes(k)) ordered.push(k); });

  const makeChip = (key, label, active) => {
    const chip = el("button", "chip" + (active ? " is-active" : ""), label);
    chip.type = "button";
    chip.dataset.filter = key;
    return chip;
  };

  filtersBox.append(makeChip("all", "全部", true));
  ordered.forEach((k) => filtersBox.append(makeChip(k, categoryLabel(k), false)));
}

// 點分類按鈕時篩選
filtersBox.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  const filter = chip.dataset.filter;

  filtersBox.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
  chip.classList.add("is-active");

  let visibleCount = 0;
  worksList.querySelectorAll(".work").forEach((work) => {
    const show = filter === "all" || work.dataset.category === filter;
    work.hidden = !show;
    if (show) visibleCount++;
  });
  emptyMsg.hidden = visibleCount > 0;
});

if (typeof WORKS !== "undefined" && Array.isArray(WORKS)) {
  // 依年份由新到舊排序
  [...WORKS]
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .forEach((w) => worksList.append(buildWork(w)));
  buildFilters(WORKS);
} else {
  // works.js 沒載入成功時的提示
  emptyMsg.textContent = "作品載入失敗，請確認 works.js 有一起上傳。";
  emptyMsg.hidden = false;
}

// ===== 4. 頁尾年份自動更新 =====
document.getElementById("year").textContent = new Date().getFullYear();

// ===== 5. 背景效果 =====
// 淺色模式：天空漸層隨捲動移動　深色模式：閃爍星空
const canvas = document.getElementById("stars");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let stars = [];
let w = 0, h = 0;
let scrollNow = 0; // 目前顯示的捲動進度（0～1），會慢慢追上實際位置，讓動作更滑順

const isDark = () => root.getAttribute("data-theme") === "dark";

// 星星大小：1 倍、2 倍、3 倍穿插（小的最多，大的少數）
function pickStarRadius() {
  const base = 0.8;              // ✏️ 1 倍的大小（像素）
  const roll = Math.random();
  const scale = roll < 0.6 ? 1 : roll < 0.88 ? 2 : 3;
  return base * scale;
}

// 建立星星：數量依畫面大小決定
function setupStars() {
  const dpr = window.devicePixelRatio || 1;
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.min(260, Math.floor((w * h) / 5000)); // ✏️ 想要更多星星就把 5000 改小
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: pickStarRadius(),                   // 星星大小（1～3 倍）
    speed: Math.random() * 1.8 + 0.4,      // 閃爍速度
    phase: Math.random() * Math.PI * 2,    // 每顆星星的起始時間不同
  }));
}

function drawStars(time) {
  ctx.clearRect(0, 0, w, h);
  const t = time / 1000;
  for (const s of stars) {
    const twinkle = reduceMotion ? 0.7 : 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = 0.15 + 0.85 * twinkle;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function frame(time) {
  // 淺色模式：更新漸層位置
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const target = max > 0 ? window.scrollY / max : 0;
  scrollNow += (target - scrollNow) * (reduceMotion ? 1 : 0.08);
  root.style.setProperty("--scroll", scrollNow.toFixed(4));

  // 深色模式：畫星星
  if (isDark()) drawStars(time);

  // 頭像周圍的光點
  drawOrbit(time);

  // 粒子流動分隔線
  drawFlow(time);

  requestAnimationFrame(frame);
}

setupStars();
window.addEventListener("resize", setupStars);
requestAnimationFrame(frame);

// ===== 6. 滑鼠微光 ✦ =====
const canHover = window.matchMedia("(pointer: fine)").matches;

if (canHover && !reduceMotion) {
  let lastX = 0, lastY = 0;
  const GAP = 22; // ✏️ 滑鼠每移動幾像素冒出一顆，數字越小越密

  document.addEventListener("mousemove", (e) => {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.hypot(dx, dy) < GAP) return;
    lastX = e.clientX;
    lastY = e.clientY;

    const star = document.createElement("span");
    star.className = "sparkle";
    star.textContent = "✦";
    star.style.left = e.clientX + "px";
    star.style.top = e.clientY + "px";
    star.style.fontSize = (Math.random() * 15 + 15) + "px"; // 15～30px
    star.style.setProperty("--dx", (Math.random() * 30 - 15) + "px");
    star.style.setProperty("--dy", (Math.random() * 30 + 5) + "px"); // 往下飄落
    document.body.appendChild(star);

    star.addEventListener("animationend", () => star.remove());
  });
}

// ===== 7. 重點螢光筆：捲動到畫面時，標記由左到右刷過 =====
const marks = document.querySelectorAll("mark.hl");

if ("IntersectionObserver" in window && !reduceMotion && marks.length) {
  document.body.classList.add("hl-ready"); // 啟用「先隱藏、再刷出」的效果

  // 同一段落有多個重點時，依序刷出
  marks.forEach((m) => {
    const siblings = [...m.parentElement.querySelectorAll("mark.hl")];
    m.style.transitionDelay = siblings.indexOf(m) * 0.25 + "s";
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-on");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  marks.forEach((m) => io.observe(m));
}

// ===== 8. 頭像周圍的光點 =====
const orbitCanvas = document.getElementById("orbit");
const orbitCtx = orbitCanvas ? orbitCanvas.getContext("2d") : null;

const ORBIT_COUNT = 40;       // ✏️ 光點數量
const ORBIT_MIN = 0.5;        // ✏️ 最小光點（像素，半徑）
const ORBIT_MAX = 4;          // ✏️ 最大光點（像素，半徑）
const ORBIT_HOLLOW = false;   // ✏️ 改成 true，光點會變成空心圓圈「。」

let orbitSize = 0;
let orbitVisible = true;
let orbiters = [];

function setupOrbit() {
  if (!orbitCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = orbitCanvas.getBoundingClientRect();
  if (!rect.width) return;

  orbitSize = rect.width;
  orbitCanvas.width = rect.width * dpr;
  orbitCanvas.height = rect.height * dpr;
  orbitCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  orbiters = Array.from({ length: ORBIT_COUNT }, () => {
    const radius = 0.5 + Math.random() * 0.45;         // 離頭像中心的距離（畫布半徑的 0.5～0.95 倍，剛好在頭像外圍）
    const dir = Math.random() < 0.5 ? -1 : 1;           // 順時針或逆時針
    return {
      angle: Math.random() * Math.PI * 2,
      radius,
      speed: dir * (0.08 + Math.random() * 0.2) * (1.3 - radius * 0.6), // 越靠近頭像轉越快
      size: ORBIT_MIN + Math.pow(Math.random(), 2.2) * (ORBIT_MAX - ORBIT_MIN), // 小光點比較多、大光點少
      wobble: 0.01 + Math.random() * 0.035,             // 軌道忽遠忽近
      wobbleSpeed: 0.3 + Math.random() * 0.6,
      twinkle: 0.8 + Math.random() * 1.6,               // 閃爍速度
      phase: Math.random() * Math.PI * 2,
    };
  });
}

function drawOrbit(time) {
  if (!orbitCtx || !orbitVisible || !orbitSize) return;

  const t = time / 1000;
  const half = orbitSize / 2;
  // 白天：暖白色光點 + 金色光暈；夜晚：淡藍白光點 + 月光藍光暈
  const fill = isDark() ? "rgb(230, 238, 255)" : "rgb(255, 251, 230)";
  const glow = isDark() ? "rgb(124, 155, 255)" : "rgb(255, 196, 64)";

  orbitCtx.clearRect(0, 0, orbitSize, orbitSize);
  orbitCtx.fillStyle = fill;
  orbitCtx.strokeStyle = fill;
  orbitCtx.shadowColor = glow;

  for (const o of orbiters) {
    const a = o.angle + (reduceMotion ? 0 : t * o.speed);
    const r = (o.radius + (reduceMotion ? 0 : Math.sin(t * o.wobbleSpeed + o.phase) * o.wobble)) * half;
    const x = half + Math.cos(a) * r;
    const y = half + Math.sin(a) * r;
    const twinkle = reduceMotion ? 0.8 : 0.55 + 0.45 * Math.sin(t * o.twinkle + o.phase);

    orbitCtx.globalAlpha = twinkle;
    orbitCtx.shadowBlur = o.size * 4;
    orbitCtx.beginPath();
    orbitCtx.arc(x, y, o.size, 0, Math.PI * 2);
    if (ORBIT_HOLLOW) {
      orbitCtx.lineWidth = Math.max(0.6, o.size * 0.35);
      orbitCtx.stroke();
    } else {
      orbitCtx.fill();
    }
  }
  orbitCtx.globalAlpha = 1;
  orbitCtx.shadowBlur = 0;
}

if (orbitCanvas) {
  setupOrbit();
  window.addEventListener("load", setupOrbit);
  if ("ResizeObserver" in window) new ResizeObserver(setupOrbit).observe(orbitCanvas);
  else window.addEventListener("resize", setupOrbit);

  // 頭像不在畫面內時，暫停繪製以節省效能
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      orbitVisible = entries[0].isIntersecting;
    }).observe(orbitCanvas);
  }
}

// ===== 9. 首頁職稱打字機 =====
const typedEl = document.getElementById("typed");
if (typedEl && !reduceMotion) {
  const phrases = ["Project Manager", "Data Wrangler", "Unity Game Dev"]; // ✏️ 想換成別的職稱就改這裡
  let pi = 0, ci = 0, deleting = false;

  const tick = () => {
    const word = phrases[pi];
    if (!deleting) {
      ci++;
      typedEl.textContent = word.slice(0, ci);
      if (ci === word.length) { deleting = true; return setTimeout(tick, 1600); }
      return setTimeout(tick, 80);
    }
    ci--;
    typedEl.textContent = word.slice(0, ci);
    if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; return setTimeout(tick, 350); }
    return setTimeout(tick, 40);
  };

  typedEl.textContent = "";
  // 等載入畫面結束後才開始打字
  let waited = 0;
  const waiter = setInterval(() => {
    waited += 200;
    if (root.classList.contains("is-loaded") || waited > 6000) {
      clearInterval(waiter);
      setTimeout(tick, 600);
    }
  }, 200);
}

// ===== 10. 粒子流動分隔線（數位資料流） =====
const flowCanvas = document.getElementById("flow");
const flowCtx = flowCanvas ? flowCanvas.getContext("2d") : null;

let flowW = 0, flowH = 0;
let flowVisible = false;
let flowLast = 0;
let flowT = 0;
let flowParticles = [];
const flowPointer = { x: -999, y: -999 };

function setupFlow() {
  if (!flowCanvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = flowCanvas.getBoundingClientRect();
  if (!rect.width) return;

  flowW = rect.width;
  flowH = rect.height;
  flowCanvas.width = flowW * dpr;
  flowCanvas.height = flowH * dpr;
  flowCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = Math.max(50, Math.min(170, Math.round(flowW * 0.09))); // ✏️ 0.09 越大粒子越多
  flowParticles = Array.from({ length: count }, () => ({
    x: Math.random() * flowW,
    lane: Math.random() * 2 - 1,          // 在哪一條「流線」上（-1～1）
    speed: 35 + Math.random() * 95,       // 流動速度（像素／秒）
    size: 0.7 + Math.random() * 1.6,
    square: Math.random() < 0.3,          // 約三成是方塊像素，更有數位感
    alt: Math.random() < 0.4,             // 約四成使用第二種顏色
    phase: Math.random() * Math.PI * 2,
    tw: 0.8 + Math.random() * 1.5,        // 閃爍速度
  }));
}

// 流線的位置：整體波動 + 流束時寬時窄（像資料匯聚又散開）
function flowY(lane, x, t) {
  const mid = flowH / 2;
  const spread = flowH * 0.30 * (0.55 + 0.45 * Math.sin(x * 0.0045 + t * 0.5));
  const wave = Math.sin(x * 0.007 + t * 0.8) * flowH * 0.12;
  return mid + wave + lane * spread;
}

// 滑鼠靠近時，粒子會被推開
function pushAway(x, y) {
  const dx = x - flowPointer.x;
  const dy = y - flowPointer.y;
  const d = Math.hypot(dx, dy);
  if (d < 70 && d > 0.1) return y + (dy / d) * (70 - d) * 0.6;
  return y;
}

function drawFlow(time) {
  if (!flowCtx || !flowVisible || !flowW) return;

  const dt = flowLast ? Math.min((time - flowLast) / 1000, 0.05) : 0;
  flowLast = time;
  if (!reduceMotion) flowT += dt;
  const t = flowT;

  // 白天：藍 + 金　夜晚：青 + 紫
  const c1 = isDark() ? [0, 229, 255] : [47, 91, 234];
  const c2 = isDark() ? [167, 139, 250] : [232, 163, 23];

  flowCtx.clearRect(0, 0, flowW, flowH);
  const TRAIL = 7;

  for (const p of flowParticles) {
    if (!reduceMotion) {
      p.x += p.speed * dt;
      if (p.x > flowW + 20) p.x = -20;
    }
    const c = p.alt ? c2 : c1;
    const tw = reduceMotion ? 0.85 : 0.6 + 0.4 * Math.sin(t * p.tw + p.phase);
    const step = 7 * (p.speed / 70);

    // 尾巴：沿著目前的流線往回畫，越遠越淡
    let px = 0, py = 0;
    let hx = 0, hy = 0;
    for (let k = 0; k <= TRAIL; k++) {
      const x = p.x - k * step;
      const y = pushAway(x, flowY(p.lane, x, t));
      if (k === 0) { hx = x; hy = y; }
      else {
        flowCtx.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(1 - k / TRAIL) * 0.55 * tw})`;
        flowCtx.lineWidth = p.size * 0.7;
        flowCtx.beginPath();
        flowCtx.moveTo(px, py);
        flowCtx.lineTo(x, y);
        flowCtx.stroke();
      }
      px = x;
      py = y;
    }

    // 光暈 + 亮點（有些是圓形，有些是方塊）
    flowCtx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.15 * tw})`;
    flowCtx.beginPath();
    flowCtx.arc(hx, hy, p.size * 3, 0, Math.PI * 2);
    flowCtx.fill();

    flowCtx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.95 * tw})`;
    if (p.square) {
      flowCtx.fillRect(hx - p.size, hy - p.size, p.size * 2, p.size * 2);
    } else {
      flowCtx.beginPath();
      flowCtx.arc(hx, hy, p.size, 0, Math.PI * 2);
      flowCtx.fill();
    }
  }
}

if (flowCanvas) {
  setupFlow();
  window.addEventListener("load", setupFlow);
  if ("ResizeObserver" in window) new ResizeObserver(setupFlow).observe(flowCanvas);
  else window.addEventListener("resize", setupFlow);

  // 不在畫面內時暫停繪製
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      flowVisible = entries[0].isIntersecting;
    }, { rootMargin: "100px" }).observe(flowCanvas);
  } else {
    flowVisible = true;
  }

  window.addEventListener("mousemove", (e) => {
    if (!flowVisible) return;
    const r = flowCanvas.getBoundingClientRect();
    flowPointer.x = e.clientX - r.left;
    flowPointer.y = e.clientY - r.top;
  });
  document.addEventListener("mouseleave", () => { flowPointer.x = flowPointer.y = -999; });
}

// ===== 11. 捲動進場 + 數字由 0 數到目標值 =====
const revealEls = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduceMotion && revealEls.length) {
  document.body.classList.add("reveal-ready");
  const rio = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const index = [...el.parentElement.children].indexOf(el);
        el.style.transitionDelay = index * 0.08 + "s";   // 同一排的項目依序出現
        el.classList.add("is-on");
        setTimeout(() => { el.style.transitionDelay = ""; }, 1200);
        rio.unobserve(el);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  revealEls.forEach((el) => rio.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add("is-on"));
}

const statNums = document.querySelectorAll(".stat-num[data-count]");
const formatStat = (el, n) => {
  el.textContent = (el.dataset.prefix || "") + Math.round(n) + (el.dataset.suffix || "");
};

if ("IntersectionObserver" in window && !reduceMotion && statNums.length) {
  statNums.forEach((el) => formatStat(el, 0));
  const cio = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        cio.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        const t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 1400);
          formatStat(el, target * (1 - Math.pow(1 - k, 3)));  // 先快後慢
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 }
  );
  statNums.forEach((el) => cio.observe(el));
}

// ===== 12. 導覽列：標示目前所在的區塊 =====
const navLinks = [...document.querySelectorAll(".nav a")];
if ("IntersectionObserver" in window && navLinks.length) {
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  ["works", "about", "contact"].forEach((id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });
}
