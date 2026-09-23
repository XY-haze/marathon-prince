/* 《马拉松王子》资料站 — 交互脚本（无外部依赖，可直接 file:// 打开） */
(function () {
  "use strict";

  /* --------------------------------------------------- 导航当前页高亮 */
  function markCurrentPage() {
    var here = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".nav__links a").forEach(function (a) {
      var target = a.getAttribute("href");
      if (target === here) a.setAttribute("aria-current", "page");
    });
  }

  /* --------------------------------------------------- 滚动进场动画 */
  function setupReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  }

  /* --------------------------------------------------- 分集目录：搜索 + 分段筛选 */
  function setupEpisodeBrowser() {
    var list = document.getElementById("epList");
    if (!list) return;
    var search = document.getElementById("epSearch");
    var buttons = Array.prototype.slice.call(document.querySelectorAll("[data-range]"));
    var counter = document.getElementById("epCount");
    var empty = document.getElementById("epEmpty");
    var items = Array.prototype.slice.call(list.querySelectorAll(".ep"));
    var total = items.length;
    var range = "all";

    function inRange(el, value) {
      if (value === "all") return true;
      var g = el.getAttribute("data-group");
      return g === value;
    }

    function apply() {
      var q = (search && search.value ? search.value : "").trim().toLowerCase();
      var shown = 0;
      items.forEach(function (el) {
        var hay = (el.getAttribute("data-search") || "").toLowerCase();
        var ok = inRange(el, range) && (!q || hay.indexOf(q) !== -1);
        el.classList.toggle("is-hidden", !ok);
        if (ok) shown++;
      });
      if (counter) {
        counter.textContent =
          "显示 " + shown + " / " + total + " 集" + (q ? "（关键词：" + q + "）" : "");
      }
      if (empty) empty.hidden = shown !== 0;
    }

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        range = btn.getAttribute("data-range");
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
        apply();
      });
    });

    if (search) {
      search.addEventListener("input", apply);
      search.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          search.value = "";
          apply();
        }
      });
    }

    // 支持 #ep-30 之类的锚点直达：自动清空筛选
    if (location.hash && /^#ep-\d+$/.test(location.hash)) {
      var target = document.querySelector(location.hash);
      if (target) {
        range = "all";
        if (search) search.value = "";
        buttons.forEach(function (b) {
          b.setAttribute("aria-pressed", String(b.getAttribute("data-range") === "all"));
        });
        apply();
      }
    }

    apply();
  }

  /* --------------------------------------------------- 分集目录：键盘快捷筛选（按集号跳转） */
  function setupEpisodeJump() {
    var jump = document.getElementById("epJump");
    if (!jump) return;
    jump.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      var n = parseInt(jump.value, 10);
      if (!n || n < 1 || n > 52) return;
      var el = document.getElementById("ep-" + n);
      if (!el) return;
      document.querySelectorAll("[data-range]").forEach(function (b) {
        b.setAttribute("aria-pressed", "false");
      });
      var all = document.querySelector('[data-range="all"]');
      if (all) all.click();
      el.classList.remove("is-hidden");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.transition = "box-shadow .3s ease";
      el.style.boxShadow = "0 0 0 4px rgba(255,122,47,.35)";
      setTimeout(function () {
        el.style.boxShadow = "";
      }, 2200);
    });
  }

  /* --------------------------------------------------- 目录高亮：回到当前区块 */
  function setupTocHighlight() {
    var tocLinks = document.querySelectorAll(".toc a[href^='#']");
    if (!tocLinks.length || !("IntersectionObserver" in window)) return;
    var map = {};
    tocLinks.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = a;
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var a = map[entry.target.id];
          if (!a) return;
          if (entry.isIntersecting) {
            tocLinks.forEach(function (x) {
              x.style.borderColor = "";
              x.style.background = "";
            });
            a.style.borderColor = "var(--flame-400)";
            a.style.background = "rgba(255,201,77,.18)";
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.keys(map).forEach(function (id) {
      io.observe(document.getElementById(id));
    });
  }

  /* --------------------------------------------------- 页码年份 */
  function stampYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    markCurrentPage();
    setupReveal();
    setupEpisodeBrowser();
    setupEpisodeJump();
    setupTocHighlight();
    stampYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
