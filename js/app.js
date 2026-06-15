/* =============================================================
   app.js — Arranque y orquestación de la interfaz
   -------------------------------------------------------------
   Inicializa los datos, monta filtros, gestiona la navegación
   entre vistas, el tema claro/oscuro, el selector de zona
   horaria, el modal de detalle y el "tick" de cuentas regresivas.
   ============================================================= */
(function (global) {
  "use strict";

  const App = {
    userTz: global.TZ.userZone(),
    view: "calendario",
  };

  /* ---------------- Tema claro / oscuro ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.querySelector("#themeToggle .icon-btn__icon");
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem("wc2026-theme", theme); } catch (e) {}
  }
  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("wc2026-theme"); } catch (e) {}
    const prefersDark = global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
    document.getElementById("themeToggle").addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme");
      applyTheme(cur === "dark" ? "light" : "dark");
    });
  }

  /* ---------------- Selector de zona horaria ---------------- */
  function initTzSelector() {
    const sel = document.getElementById("tzSelect");
    const zones = [App.userTz, ...global.TZ.COMMON_ZONES.filter((z) => z !== App.userTz)];
    sel.innerHTML = zones
      .map((z, i) => `<option value="${z}">${z}${i === 0 ? " (tú)" : ""}</option>`)
      .join("");
    sel.value = App.userTz;
    sel.addEventListener("change", (e) => {
      App.userTz = e.target.value;
      rerenderCalendar();
    });
  }

  /* ---------------- Navegación entre vistas ---------------- */
  function showView(view) {
    App.view = view;
    document.querySelectorAll(".tab").forEach((t) => {
      const active = t.dataset.view === view;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".view").forEach((v) => {
      const active = v.id === "view-" + view;
      v.classList.toggle("is-active", active);
      v.hidden = !active;
    });
    // La barra de filtros aplica al calendario; se oculta en otras vistas.
    document.getElementById("filtersBar").style.display = view === "calendario" ? "" : "none";
  }
  function initNav() {
    document.querySelectorAll(".tab").forEach((t) =>
      t.addEventListener("click", () => showView(t.dataset.view))
    );
  }

  /* ---------------- Renderizado ---------------- */
  function rerenderCalendar() {
    const filtered = global.WCFilters.apply(global.WCData.all());
    global.WCCalendar.render(document.getElementById("calendarDays"), filtered, App.userTz);
  }
  function renderAll() {
    rerenderCalendar();
    global.WCGroups.render(document.getElementById("groupsGrid"));
    global.WCBracket.render(document.getElementById("bracket"));
  }

  /* ---------------- Modal de detalle ---------------- */
  function findByIdx(idx) {
    return global.WCData.all().find((p) => String(p._idx) === String(idx));
  }
  function openModal(idx) {
    const p = findByIdx(idx);
    if (!p) return;
    const fin = p._estado === "finalizado";
    const esc = global.escapeHtml;

    const fechaLarga = p.fecha
      ? new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
          .format(new Date(p.fecha + "T12:00:00Z"))
      : "Por confirmar";

    const horaOficial = p.horaLocal && p._instante
      ? `${p.horaLocal} ${global.TZ.offsetLabel(p._instante, p.zonaHoraria)} (${esc(p.ciudad)})`
      : "Por confirmar";
    const horaLocal = p._instante
      ? `${global.TZ.timeInZone(p._instante, App.userTz)} ${global.TZ.offsetLabel(p._instante, App.userTz)}`
      : "—";

    const estadoTxt = {
      finalizado: "Finalizado", "en vivo": "En juego",
      "por confirmar": "Resultado por confirmar", programado: "Programado",
    }[p._estado] || p._estado;

    const scoreBlock = fin
      ? `<div class="modal__score">${p.resultadoLocal} – ${p.resultadoVisitante}</div>`
      : `<div class="modal__vs">vs</div>`;

    const countdownBlock = p._estado === "programado" && p._instante
      ? `<div class="modal__countdown js-countdown" data-ko="${p._instante.getTime()}">${global.fmtCountdown(p._instante.getTime() - Date.now())}</div>`
      : "";

    const fuente = p.fuente
      ? `<li><span class="label">Fuente del dato</span><span class="value"><a href="${esc(p.fuente)}" target="_blank" rel="noopener">origen ↗</a></span></li>`
      : "";

    document.getElementById("modalBody").innerHTML = `
      <div class="modal__match-head">
        <span class="match-card__phase">${esc(p.fase)}${p.grupo && p.grupo !== "?" ? " · Grupo " + p.grupo : ""}${p.numero != null ? " · #" + p.numero : ""}</span>
        <div class="modal__teams">
          <div class="modal__team"><span class="flag">${p._localFlag}</span><strong>${esc(p.local)}</strong></div>
          ${scoreBlock}
          <div class="modal__team"><span class="flag">${p._visitFlag}</span><strong>${esc(p.visitante)}</strong></div>
        </div>
      </div>
      ${countdownBlock}
      <ul class="modal__info-list">
        <li><span class="label">Estado</span><span class="value">${estadoTxt}</span></li>
        <li><span class="label">Fecha</span><span class="value">${fechaLarga}</span></li>
        <li><span class="label">Hora oficial</span><span class="value">${horaOficial}</span></li>
        <li><span class="label">Tu hora (${App.userTz})</span><span class="value">${horaLocal}</span></li>
        <li><span class="label">Sede</span><span class="value">${esc(p.estadio)}</span></li>
        <li><span class="label">Ciudad</span><span class="value">${esc(p.ciudad)}</span></li>
        ${fuente}
      </ul>`;

    document.getElementById("matchModal").hidden = false;
  }
  function closeModal() { document.getElementById("matchModal").hidden = true; }

  function initModal() {
    // Apertura por clic/teclado en cualquier tarjeta con data-idx (delegación).
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-idx]");
      if (el) openModal(el.dataset.idx);
      if (e.target.closest("[data-close-modal]")) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
      if ((e.key === "Enter" || e.key === " ") && document.activeElement) {
        const el = document.activeElement.closest && document.activeElement.closest("[data-idx]");
        if (el) { e.preventDefault(); openModal(el.dataset.idx); }
      }
    });
  }

  /* ---------------- Descarga del calendario ---------------- */
  function initExport() {
    const btn = document.getElementById("exportBtn");
    const menu = document.getElementById("exportMenu");
    if (!btn || !menu) return;
    const close = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const abrir = menu.hidden;
      menu.hidden = !abrir;
      btn.setAttribute("aria-expanded", abrir ? "true" : "false");
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".export")) close(); });

    menu.querySelectorAll("[data-export]").forEach((b) =>
      b.addEventListener("click", () => {
        const kind = b.dataset.export;
        if (kind === "json") {
          global.WCExport.download("mundial-2026-datos.json", global.WCExport.toJSON(), "application/json");
        } else {
          const lista = kind === "ics-filtered"
            ? global.WCFilters.apply(global.WCData.all())
            : global.WCData.all();
          const { texto, eventos } = global.WCExport.toICS(lista, "Mundial 2026");
          const nombre = "mundial-2026" + (kind === "ics-filtered" ? "-filtrado" : "") + ".ics";
          global.WCExport.download(nombre, texto, "text/calendar");
          const banner = document.getElementById("dataBanner");
          if (banner) {
            banner.hidden = false;
            banner.innerHTML = `✅ Descargado <strong>${nombre}</strong> con <strong>${eventos}</strong> partido(s). ` +
              "Impórtalo en Google Calendar, Outlook o Apple Calendar.";
          }
        }
        close();
      })
    );
  }

  /* ---------------- Tick de cuentas regresivas ---------------- */
  function initTicker() {
    setInterval(() => {
      const now = Date.now();
      document.querySelectorAll(".js-countdown").forEach((el) => {
        const ko = Number(el.dataset.ko);
        if (!ko) return;
        el.textContent = global.fmtCountdown(ko - now);
      });
    }, 1000);
  }

  /* ---------------- Banner de metadatos / estado ---------------- */
  function initBanner() {
    const meta = global.WCData.meta();
    const banner = document.getElementById("dataBanner");
    const footer = document.getElementById("footerMeta");
    if (!global.WCData.isLoaded()) {
      banner.hidden = false;
      banner.innerHTML = "⚠️ No se pudieron cargar los datos (data/datos.js). Revisa el README para generarlos con el scraping.";
      footer.textContent = "Sin datos cargados.";
      return;
    }
    const total = global.WCData.all().length;
    const tbd = global.WCData.all().filter((p) => p._estado === "por confirmar").length;
    if (meta) {
      banner.hidden = false;
      banner.innerHTML = `📊 <strong>${total}</strong> partidos · datos extraídos el <strong>${meta.fechaExtraccion || "—"}</strong> y contrastados con ${(meta.fuentes || []).length} fuente(s). ${tbd ? `<strong>${tbd}</strong> con resultado/horario por confirmar.` : ""}`;
      footer.innerHTML = `Fuentes: ${(meta.fuentes || []).map((u) => `<a href="${global.escapeHtml(u)}" target="_blank" rel="noopener">${global.escapeHtml(new URL(u).hostname)}</a>`).join(" · ")}`;
    }
  }

  /* ---------------- Init ---------------- */
  function init() {
    global.WCData.init();
    initTheme();
    initTzSelector();
    initNav();
    initModal();
    initExport();
    initBanner();

    if (global.WCData.isLoaded()) {
      global.WCFilters.mount(rerenderCalendar);
      renderAll();
      initTicker();
    }
    showView("calendario");
  }

  document.addEventListener("DOMContentLoaded", init);
})(window);
