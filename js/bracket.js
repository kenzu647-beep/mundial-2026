/* =============================================================
   bracket.js — Cuadro de eliminatorias
   -------------------------------------------------------------
   Dibuja columnas por ronda (dieciseisavos → final) más el
   partido por el tercer lugar. Usa los marcadores de posición
   (1A, 2B, Ganador 73…) hasta que se conozcan los clasificados.
   ============================================================= */
(function (global) {
  "use strict";

  const ROUNDS = [
    { fase: "Dieciseisavos", titulo: "Dieciseisavos" },
    { fase: "Octavos", titulo: "Octavos" },
    { fase: "Cuartos", titulo: "Cuartos" },
    { fase: "Semifinales", titulo: "Semifinales" },
    { fase: "Final", titulo: "Final" },
    { fase: "Tercer lugar", titulo: "Tercer lugar" },
  ];

  function shortDate(fecha) {
    if (!fecha) return "";
    return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" })
      .format(new Date(fecha + "T12:00:00Z"));
  }

  function matchBox(p) {
    const fin = p._estado === "finalizado";
    const sL = fin ? p.resultadoLocal : "";
    const sV = fin ? p.resultadoVisitante : "";
    const isFinal = p.fase === "Final";
    return `<div class="bracket-match ${isFinal ? "bracket-match--final" : ""}" data-idx="${p._idx}" tabindex="0" role="button">
      <div class="bracket-match__meta">
        <span>${p.numero != null ? "#" + p.numero : ""}</span>
        <span>${shortDate(p.fecha)} · ${global.escapeHtml(p.ciudad || "")}</span>
      </div>
      <div class="bracket-match__team"><span>${global.escapeHtml(p.local)}</span><span>${sL}</span></div>
      <div class="bracket-match__team"><span>${global.escapeHtml(p.visitante)}</span><span>${sV}</span></div>
    </div>`;
  }

  function render(container) {
    const all = global.WCData.all();
    let html = "";
    ROUNDS.forEach((r) => {
      const list = all
        .filter((p) => p.fase === r.fase)
        .sort((a, b) => (a.numero || 0) - (b.numero || 0));
      if (!list.length) return;
      html += `<div class="bracket__round">
        <div class="bracket__round-title">${r.titulo} (${list.length})</div>
        ${list.map(matchBox).join("")}
      </div>`;
    });

    if (!html) {
      container.innerHTML = `<p class="empty-state">El cuadro de eliminatorias aún no está disponible.</p>`;
      return;
    }
    container.innerHTML = html;
  }

  global.WCBracket = { render };
})(window);
