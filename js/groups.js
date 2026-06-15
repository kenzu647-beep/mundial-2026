/* =============================================================
   groups.js — Vista de grupos con tabla de posiciones
   -------------------------------------------------------------
   Una tarjeta por grupo (A–L) con sus 4 selecciones y la tabla
   de posiciones calculada en standings.js. Resalta los dos
   primeros (clasifican) y el tercero (posible mejor tercero).
   ============================================================= */
(function (global) {
  "use strict";

  function row(r, pos) {
    let cls = "";
    if (pos < 2) cls = "qualifies";
    else if (pos === 2) cls = "third";
    return `<tr class="${cls}">
      <td>${pos + 1}</td>
      <td><span class="standings__team"><span>${global.WCData.flag(r.equipo)}</span>${global.escapeHtml(r.equipo)}</span></td>
      <td>${r.pj}</td>
      <td>${r.pg}</td>
      <td>${r.pe}</td>
      <td>${r.pp}</td>
      <td>${r.gf}:${r.gc}</td>
      <td>${r.dg > 0 ? "+" + r.dg : r.dg}</td>
      <td class="standings__pts">${r.pts}</td>
    </tr>`;
  }

  function groupCard(g) {
    const rows = global.WCStandings.forGroup(g.grupo, g.equipos);
    const jugados = global.WCData
      .all()
      .filter((p) => p.grupo === g.grupo && p.resultadoLocal != null).length;

    return `<div class="group-card">
      <div class="group-card__head">
        <h3>Grupo ${g.grupo}</h3>
        <span class="group-card__conf">${jugados} jugado(s)${g.confianzaLetra ? " · letra " + g.confianzaLetra : ""}</span>
      </div>
      <table class="standings">
        <thead>
          <tr>
            <th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF:GC</th><th>DG</th><th>Pts</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, i) => row(r, i)).join("")}
        </tbody>
      </table>
    </div>`;
  }

  function render(container) {
    const groups = global.WCData.groups();
    if (!groups.length) {
      container.innerHTML = `<p class="empty-state">No hay datos de grupos disponibles.</p>`;
      return;
    }
    container.innerHTML =
      groups.map(groupCard).join("") +
      `<div class="group-legend">
        <span class="legend-q">1.º y 2.º: avanzan a dieciseisavos</span>
        <span class="legend-3">3.º: posible "mejor tercero" (8 clasifican)</span>
      </div>`;
  }

  global.WCGroups = { render };
})(window);
