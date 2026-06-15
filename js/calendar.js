/* =============================================================
   calendar.js — Vista de calendario por días
   -------------------------------------------------------------
   Agrupa los partidos por fecha y dibuja una tarjeta por cada
   uno con: fase, grupo, equipos+banderas, marcador o cuenta
   regresiva, hora oficial de la sede y hora local del usuario.
   ============================================================= */
(function (global) {
  "use strict";

  /* --- Util de cuenta regresiva, compartida con el modal/bracket --- */
  function fmtCountdown(ms) {
    if (ms <= 0) return "¡Comienza!";
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    return `${m}m ${sec}s`;
  }
  global.fmtCountdown = fmtCountdown;

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }
  global.escapeHtml = escapeHtml;

  /** Cabecera de fecha legible: "jueves 11 de junio de 2026". */
  function dateHeader(fecha) {
    const d = new Date(fecha + "T12:00:00Z");
    const txt = new Intl.DateTimeFormat("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
    }).format(d);
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  function statusChip(p) {
    switch (p._estado) {
      case "finalizado": return `<span class="status-chip status-chip--final">Final</span>`;
      case "en vivo": return `<span class="status-chip status-chip--live">● En juego</span>`;
      case "por confirmar": return `<span class="status-chip status-chip--tbd">Por confirmar</span>`;
      default: return `<span class="status-chip status-chip--upcoming">Próximo</span>`;
    }
  }

  function teamRow(name, flagEmoji, score, isWinner, isPlaceholder) {
    const cls = ["team-row"];
    if (isWinner) cls.push("is-winner");
    if (isPlaceholder) cls.push("is-placeholder");
    const scoreTxt = score == null ? "" : `<span class="team-row__score">${score}</span>`;
    return `<div class="${cls.join(" ")}">
      <span class="team-row__name"><span class="team-row__flag">${flagEmoji}</span>${escapeHtml(name)}</span>
      ${scoreTxt}
    </div>`;
  }

  function timeBlock(p, userTz) {
    if (!p.horaLocal || !p._instante) {
      return `<div class="time-block"><div class="time-block__official">Horario por confirmar</div></div>`;
    }
    const offVenue = global.TZ.offsetLabel(p._instante, p.zonaHoraria);
    const localTime = global.TZ.timeInZone(p._instante, userTz);
    const offUser = global.TZ.offsetLabel(p._instante, userTz);
    return `<div class="time-block">
      <div class="time-block__official">${p.horaLocal} <small>${offVenue}</small></div>
      <div class="time-block__local">Tu hora: ${localTime} ${offUser}</div>
    </div>`;
  }

  function bottomRight(p) {
    if (p._estado === "programado" && p._instante) {
      const ms = p._instante.getTime() - Date.now();
      return `<span class="countdown js-countdown" data-ko="${p._instante.getTime()}">${fmtCountdown(ms)}</span>`;
    }
    return "";
  }

  function card(p, userTz) {
    const fin = p._estado === "finalizado";
    const lWin = fin && p.resultadoLocal > p.resultadoVisitante;
    const vWin = fin && p.resultadoVisitante > p.resultadoLocal;
    const grupoTxt = p.grupo && p.grupo !== "?" ? `<span class="match-card__group">Grupo ${p.grupo}</span>` : "";
    const num = p.numero != null ? `#${p.numero}` : "";

    return `<article class="match-card" data-idx="${p._idx}" tabindex="0" role="button" aria-label="Ver detalle del partido">
      <div class="match-card__top">
        <span class="match-card__phase">${escapeHtml(p.fase)} ${grupoTxt}</span>
        <span>${num}</span>
      </div>
      <div class="teams">
        ${teamRow(p.local, p._localFlag, fin ? p.resultadoLocal : null, lWin, p._localPlaceholder)}
        ${teamRow(p.visitante, p._visitFlag, fin ? p.resultadoVisitante : null, vWin, p._visitPlaceholder)}
      </div>
      <div class="match-card__bottom">
        <span class="match-card__venue" title="${escapeHtml(p.estadio)} · ${escapeHtml(p.ciudad)}">📍 ${escapeHtml(p.ciudad)}</span>
        <div style="display:flex;align-items:center;gap:.6rem">
          ${bottomRight(p)}
          ${statusChip(p)}
        </div>
      </div>
      ${timeBlock(p, userTz)}
    </article>`;
  }

  /** Dibuja el calendario completo a partir de una lista ya filtrada. */
  function render(container, partidos, userTz) {
    const meta = document.getElementById("calendarMeta");
    const empty = document.getElementById("calendarEmpty");

    if (!partidos.length) {
      container.innerHTML = "";
      empty.hidden = false;
      meta.textContent = "";
      return;
    }
    empty.hidden = true;
    meta.textContent = `${partidos.length} partido(s) · horarios en hora oficial de la sede y en tu zona (${userTz})`;

    // Ordena por instante (o por fecha+hora textual si falta) y agrupa por fecha.
    const sorted = [...partidos].sort((a, b) => {
      const ta = a._instante ? a._instante.getTime() : Date.parse(a.fecha + "T" + (a.horaLocal || "00:00"));
      const tb = b._instante ? b._instante.getTime() : Date.parse(b.fecha + "T" + (b.horaLocal || "00:00"));
      return ta - tb || (a.numero || 0) - (b.numero || 0);
    });

    const byDay = new Map();
    sorted.forEach((p) => {
      if (!byDay.has(p.fecha)) byDay.set(p.fecha, []);
      byDay.get(p.fecha).push(p);
    });

    let html = "";
    for (const [fecha, list] of byDay) {
      html += `<section class="day-group">
        <div class="day-group__header">
          <h2 class="day-group__date">${dateHeader(fecha)}</h2>
          <span class="day-group__count">${list.length} partido(s)</span>
        </div>
        <div class="match-grid">${list.map((p) => card(p, userTz)).join("")}</div>
      </section>`;
    }
    container.innerHTML = html;
  }

  global.WCCalendar = { render };
})(window);
