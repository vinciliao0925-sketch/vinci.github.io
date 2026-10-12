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

themeBtn.addEventListener("click", () => {
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  if (next === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  try { localStorage.setItem("theme", next); } catch (e) {}
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

// ===== 3. 作品分類篩選 =====
const chips = document.querySelectorAll(".chip");
const works = document.querySelectorAll(".work");
const emptyMsg = document.getElementById("emptyMsg");

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const filter = chip.dataset.filter;

    chips.forEach((c) => c.classList.remove("is-active"));
    chip.classList.add("is-active");

    let visibleCount = 0;
    works.forEach((work) => {
      const show = filter === "all" || work.dataset.category === filter;
      work.hidden = !show;
      if (show) visibleCount++;
    });

    emptyMsg.hidden = visibleCount > 0;
  });
});

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
