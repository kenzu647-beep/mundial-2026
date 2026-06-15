/* =============================================================
   export.js — Descarga del calendario
   -------------------------------------------------------------
   Genera un archivo .ics (iCalendar, RFC 5545) para importar los
   partidos en Google Calendar / Outlook / Apple Calendar, y
   permite descargar el dataset en .json. Las horas se exportan en
   UTC (con sufijo Z), de modo que cada app las muestra en la zona
   local del usuario automáticamente.
   ============================================================= */
(function (global) {
  "use strict";

  const pad = (n) => String(n).padStart(2, "0");

  // Date (instante) -> "YYYYMMDDTHHMMSSZ" en UTC
  function icsStamp(d) {
    return (
      d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
      "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z"
    );
  }

  // Escapa según RFC 5545 (comas, puntos y coma, barras, saltos de línea)
  function esc(s) {
    return (s || "").toString().replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
  }

  // Plegado de líneas a ~73 octetos (RFC 5545); las continuaciones empiezan con espacio.
  function fold(line) {
    const out = [];
    let buf = "";
    let bytes = 0;
    for (const ch of line) {
      const b = new TextEncoder().encode(ch).length;
      if (bytes + b > 73) {
        out.push(buf);
        buf = " " + ch;          // continuación: espacio inicial
        bytes = 1 + b;
      } else {
        buf += ch;
        bytes += b;
      }
    }
    out.push(buf);
    return out.join("\r\n");
  }

  /** Construye el contenido .ics a partir de una lista de partidos. */
  function toICS(partidos, nombre) {
    const L = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Mundial 2026//Calendario interactivo//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:" + (nombre || "Mundial 2026"),
      "X-WR-TIMEZONE:UTC",
    ];
    let n = 0;
    partidos.forEach((p) => {
      if (!p._instante) return; // sin hora confirmada → no se exporta como evento
      const start = p._instante;
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // ~2 h
      const grupoTxt = p.grupo && p.grupo !== "?" ? ` (Grupo ${p.grupo})` : ` (${p.fase})`;
      const titulo = `⚽ ${p.local} vs ${p.visitante}${grupoTxt}`;

      let desc = `${p.fase}${p.grupo && p.grupo !== "?" ? " · Grupo " + p.grupo : ""}` +
        (p.numero != null ? ` · Partido ${p.numero}` : "") +
        `\nSede: ${p.estadio}, ${p.ciudad}` +
        `\nHora oficial: ${p.horaLocal || "?"} (${p.zonaHoraria})`;
      if (p.resultadoLocal != null) {
        desc += `\nResultado: ${p.local} ${p.resultadoLocal}–${p.resultadoVisitante} ${p.visitante}`;
      } else if (p.estado === "por confirmar") {
        desc += "\nResultado: por confirmar";
      }

      L.push("BEGIN:VEVENT");
      L.push("UID:wc2026-" + (p.numero != null ? p.numero : p._idx) + "@mundial2026");
      L.push("DTSTAMP:" + icsStamp(start));
      L.push("DTSTART:" + icsStamp(start));
      L.push("DTEND:" + icsStamp(end));
      L.push("SUMMARY:" + esc(titulo));
      L.push("LOCATION:" + esc(`${p.estadio}, ${p.ciudad}${p.pais ? ", " + p.pais : ""}`));
      L.push("DESCRIPTION:" + esc(desc));
      L.push("END:VEVENT");
      n++;
    });
    L.push("END:VCALENDAR");
    return { texto: L.map(fold).join("\r\n"), eventos: n };
  }

  /** Dispara la descarga de un archivo en el navegador / Electron. */
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }

  function toJSON() {
    return JSON.stringify(global.WC2026, null, 2);
  }

  global.WCExport = { toICS, toJSON, download };
})(window);
