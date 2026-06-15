/* =============================================================
   standings.js — Tablas de posiciones por grupo
   -------------------------------------------------------------
   Calcula la clasificación de cada grupo SOLO con partidos
   finalizados (con marcador verificado). Los partidos "por
   confirmar" o futuros no suman, para no inventar posiciones.
   Criterios de orden: puntos → diferencia de gol → goles a favor
   → orden alfabético (los desempates oficiales por enfrentamiento
   directo se omiten hasta tener datos verificados).
   ============================================================= */
(function (global) {
  "use strict";

  function emptyRow(team) {
    return {
      equipo: team, pj: 0, pg: 0, pe: 0, pp: 0,
      gf: 0, gc: 0, dg: 0, pts: 0,
    };
  }

  /**
   * @param {string} grupoLetra  'A'..'L'
   * @param {string[]} equipos   4 selecciones del grupo
   * @returns {Array} filas ordenadas
   */
  function forGroup(grupoLetra, equipos) {
    const rows = {};
    equipos.forEach((t) => (rows[t] = emptyRow(t)));

    global.WCData.all()
      .filter((p) => p.grupo === grupoLetra && p.fase === "Fase de grupos")
      .forEach((p) => {
        const fin = p.resultadoLocal != null && p.resultadoVisitante != null;
        if (!fin) return;
        const L = rows[p.local], V = rows[p.visitante];
        if (!L || !V) return; // equipo fuera de la lista esperada
        const gl = p.resultadoLocal, gv = p.resultadoVisitante;
        L.pj++; V.pj++;
        L.gf += gl; L.gc += gv;
        V.gf += gv; V.gc += gl;
        if (gl > gv) { L.pg++; L.pts += 3; V.pp++; }
        else if (gl < gv) { V.pg++; V.pts += 3; L.pp++; }
        else { L.pe++; V.pe++; L.pts++; V.pts++; }
      });

    return Object.values(rows)
      .map((r) => ((r.dg = r.gf - r.gc), r))
      .sort((a, b) =>
        b.pts - a.pts ||
        b.dg - a.dg ||
        b.gf - a.gf ||
        a.equipo.localeCompare(b.equipo, "es")
      );
  }

  global.WCStandings = { forGroup };
})(window);
