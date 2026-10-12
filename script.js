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

// 雲朵轉場：進站時兩片雲從中間往左右散開；
// 切換模式時，雲先合起來，蓋住畫面後才換主題，再散開
const clouds = document.getElementById("clouds");
const noMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const useClouds = Boolean(clouds) && !noMotion;
let cloudsBusy = false;

if (!useClouds) {
  if (clouds) clouds.remove(); // 系統設定「減少動態效果」時，不播放
} else {
  cloudsBusy = true; // 開場動畫播放期間，先不接受切換
  let introStarted = false;
  const startIntro = () => {
    if (introStarted) return;
    introStarted = true;
    clouds.classList.add("is-open");
    setTimeout(() => { cloudsBusy = false; }, 1500);
  };
  if (document.readyState === "complete") setTimeout(startIntro, 350);
  else window.addEventListener("load", () => setTimeout(startIntro, 350));
  setTimeout(startIntro, 3000); // 保險：載入太慢時也會自動打開
}

themeBtn.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";

  if (!useClouds) { applyTheme(next); return; }
  if (cloudsBusy) return;
  cloudsBusy = true;

  clouds.classList.remove("is-open");   // 1. 雲合起來（約 0.9 秒）
  setTimeout(() => {
    applyTheme(next);                   // 2. 畫面被蓋住時才換主題
    setTimeout(() => {
      clouds.classList.add("is-open");  // 3. 再散開
      setTimeout(() => { cloudsBusy = false; }, 1500);
    }, 500);
  }, 950);
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
  summary.append(
    el("span", "work-title", w.title),
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
