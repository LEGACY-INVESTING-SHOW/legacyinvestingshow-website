import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

(function () {
  const root = document.querySelector(".kb-root");
  if (!root) return;

  const THEME_KEY = "kb-theme";
  const html = document.documentElement;

  function mermaidConfig() {
    const light = html.getAttribute("data-theme") === "light";
    const ink = light ? "#0a0a0a" : "#fafafa";
    const muted = light ? "#525252" : "#d4d4d4";
    const box = light ? "#f5f5f5" : "#2a2a2a";
    const line = light ? "#a3a3a3" : "#a1a1a1";
    const page = light ? "#ffffff" : "#171717";
    return {
      startOnLoad: false,
      securityLevel: "loose",
      theme: light ? "neutral" : "dark",
      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      fontSize: 18,
      flowchart: {
        htmlLabels: true,
        curve: "basis",
        padding: 18,
        nodeSpacing: 48,
        rankSpacing: 56,
        wrappingWidth: 200,
        useMaxWidth: true,
      },
      sequence: { useMaxWidth: true, actorMargin: 40, boxMargin: 12 },
      quadrantChart: { chartWidth: 520, chartHeight: 380 },
      themeVariables: {
        darkMode: !light,
        background: page,
        fontSize: "18px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        primaryColor: box,
        primaryTextColor: ink,
        primaryBorderColor: line,
        lineColor: line,
        secondaryColor: page,
        tertiaryColor: page,
        clusterBkg: page,
        clusterBorder: line,
        nodeTextColor: ink,
        mainBkg: box,
        secondBkg: page,
        titleColor: ink,
        edgeLabelBackground: page,
        textColor: muted,
      },
    };
  }

  function fitSvg(svg) {
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.maxWidth = "100%";
    svg.style.height = "auto";
    svg.style.minHeight = "14rem";
    svg.style.background = "transparent";
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const bg = svg.querySelector(":scope > rect");
    if (bg) {
      bg.setAttribute("fill", "transparent");
    }
  }

  async function paintDiagrams() {
    mermaid.initialize(mermaidConfig());
    let n = 0;
    for (const fig of document.querySelectorAll(".kb-diagram")) {
      const srcEl = fig.querySelector(".kb-mmd");
      const host = fig.querySelector(".kb-mermaid-host");
      if (!srcEl || !host) continue;
      n += 1;
      const id = "kb-mmd-" + n;
      try {
        const { svg } = await mermaid.render(id, srcEl.textContent.trim());
        host.innerHTML = svg;
        const el = host.querySelector("svg");
        if (el) fitSvg(el);
      } catch (err) {
        console.warn("mermaid", id, err);
        host.innerHTML =
          '<p class="kb-diagram-fallback">This chart could not render. The steps are in the text.</p>';
      }
    }
  }

  function setTheme(mode) {
    html.setAttribute("data-theme", mode);
    localStorage.setItem(THEME_KEY, mode);
    document.querySelectorAll(".kb-theme").forEach((btn) => {
      btn.setAttribute("aria-checked", mode === "dark" ? "true" : "false");
    });
    paintDiagrams();
  }

  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") setTheme(saved);
  else setTheme("dark");

  document.querySelectorAll(".kb-theme").forEach((btn) => {
    btn.addEventListener("click", () => {
      setTheme(html.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  const hamburger = document.querySelector(".kb-hamburger");
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      const open = root.classList.toggle("menu-open");
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  document.querySelectorAll("a.kb-chap").forEach((a) => {
    a.addEventListener("click", (e) => {
      const group = a.closest(".kb-chap-group");
      if (!group) return;
      if (a.dataset.toggle === "true") {
        e.preventDefault();
        group.classList.toggle("is-open");
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          const el = document.querySelector(href);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else {
        group.classList.add("is-open");
      }
      if (window.innerWidth <= 940) root.classList.remove("menu-open");
    });
  });

  document.querySelectorAll("a.kb-sub").forEach((a) => {
    a.addEventListener("click", () => {
      if (window.innerWidth <= 940) root.classList.remove("menu-open");
    });
  });

  const lessons = [...document.querySelectorAll(".kb-lesson, .kb-chapter")];
  const subLinks = [...document.querySelectorAll("a.kb-sub")];
  const groups = [...document.querySelectorAll(".kb-chap-group")];

  const io = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const id = visible.target.id;
      if (!id) return;
      subLinks.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
      groups.forEach((g) => {
        const hit = g.querySelector(`a[href="#${id}"]`);
        g.classList.toggle("is-active", Boolean(hit));
        if (hit) g.classList.add("is-open");
      });
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.2, 0.6] }
  );
  lessons.forEach((el) => io.observe(el));

  /* Search */
  const overlay = document.querySelector(".kb-overlay");
  const searchInput = document.querySelector(".kb-search-box input");
  const hitsEl = document.querySelector(".kb-hits");
  const index = [...document.querySelectorAll(".kb-lesson")].map((el) => {
    const h = el.querySelector("h3");
    const chap = el.closest(".kb-chapter");
    const ch = chap ? chap.querySelector("h2") : null;
    return {
      id: el.id,
      title: h ? h.textContent.trim() : "",
      chapter: ch ? ch.textContent.trim() : "",
      text: el.textContent.replace(/\s+/g, " ").slice(0, 400).trim(),
    };
  });

  function openSearch() {
    if (!overlay) return;
    overlay.classList.add("is-open");
    searchInput.value = "";
    renderHits(index.slice(0, 12));
    setTimeout(() => searchInput.focus(), 20);
  }
  function closeSearch() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
  }

  document.querySelectorAll("[data-open-search]").forEach((b) => b.addEventListener("click", openSearch));
  overlay && overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSearch(); });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
    } else if (e.key === "/" && !e.metaKey && !e.ctrlKey && document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      openSearch();
    } else if (e.key === "Escape") {
      closeSearch();
      root.classList.remove("menu-open");
    }
  });

  function renderHits(rows) {
    if (!hitsEl) return;
    if (!rows.length) {
      hitsEl.innerHTML = '<div class="kb-empty">No matching lessons.</div>';
      return;
    }
    hitsEl.innerHTML = rows
      .map(
        (r) =>
          `<a class="kb-hit" href="#${r.id}"><div class="t">${escapeHtml(r.title)}</div><div class="s">${escapeHtml(r.chapter)} — ${escapeHtml(r.text.slice(0, 140))}…</div></a>`
      )
      .join("");
    hitsEl.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeSearch));
  }

  searchInput &&
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) return renderHits(index.slice(0, 12));
      const parts = q.split(/\s+/);
      const rows = index
        .map((r) => {
          const hay = (r.title + " " + r.chapter + " " + r.text).toLowerCase();
          const score = parts.every((p) => hay.includes(p)) ? (r.title.toLowerCase().includes(q) ? 2 : 1) : 0;
          return { r, score };
        })
        .filter((x) => x.score)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((x) => x.r);
      renderHits(rows);
    });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* Checklists */
  const storeKey = "kb-checks:" + (root.dataset.course || "course");
  let savedChecks = {};
  try { savedChecks = JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch (e) {}

  document.querySelectorAll(".check-row input[type=checkbox]").forEach((box) => {
    const id = box.dataset.id;
    if (savedChecks[id]) {
      box.checked = true;
      box.closest(".check-row").classList.add("is-done");
    }
    box.addEventListener("change", () => {
      savedChecks[id] = box.checked;
      box.closest(".check-row").classList.toggle("is-done", box.checked);
      localStorage.setItem(storeKey, JSON.stringify(savedChecks));
    });
  });

  /* Calculators */
  function money(n) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  }

  const frexp = document.getElementById("fn-exp");
  const fnpas = document.getElementById("fn-pas");
  const fnout = document.getElementById("fn-out");
  function updFreedom() {
    if (!fnout || !frexp) return;
    const exp = Number(frexp.value || 0);
    const pas = Number(fnpas.value || 0);
    const gap = Math.max(exp - pas, 0);
    const nest = gap * 12 / 0.04;
    const units = gap > 0 ? Math.ceil(gap / 800) : 0;
    fnout.innerHTML =
      `<strong>${money(gap)}</strong><span>monthly gap to cover</span>` +
      `<strong style="display:block;margin-top:.55rem">${money(nest)}</strong><span>portfolio at a 4% withdrawal rate</span>` +
      `<strong style="display:block;margin-top:.55rem">${units} properties</strong><span>if each nets ~$800/month</span>`;
  }
  frexp && [frexp, fnpas].forEach((el) => el.addEventListener("input", updFreedom));
  updFreedom();

  const ar = document.getElementById("ab-rev");
  const art = document.getElementById("ab-rent");
  const abx = document.getElementById("ab-exp");
  const abs = document.getElementById("ab-start");
  const abo = document.getElementById("ab-out");
  function updArb() {
    if (!abo || !ar) return;
    const rev = Number(ar.value || 0);
    const rent = Number(art.value || 0);
    const exp = Number(abx.value || 0);
    const start = Number(abs.value || 0);
    const net = rev - rent - exp;
    const months = net > 0 && start > 0 ? (start / net).toFixed(1) : "—";
    const coc = start > 0 ? ((net * 12) / start * 100).toFixed(0) + "%" : "—";
    abo.innerHTML =
      `<strong>${money(net)}</strong><span>net cash flow / month</span>` +
      `<strong style="display:block;margin-top:.55rem">${months} months</strong><span>payback on startup capital</span>` +
      `<strong style="display:block;margin-top:.55rem">${coc}</strong><span>cash-on-cash (annualized)</span>`;
  }
  ar && [ar, art, abx, abs].forEach((el) => el.addEventListener("input", updArb));
  updArb();

  /* Hash on load */
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) setTimeout(() => el.scrollIntoView(), 50);
  }
})();
