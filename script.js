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
