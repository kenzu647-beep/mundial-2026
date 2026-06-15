/* =============================================================
   live.js — Actualización de resultados EN TIEMPO REAL
   -------------------------------------------------------------
   Consulta los marcadores actuales desde la API de Wikipedia (EN)
   — que admite CORS con origin=* — y los fusiona en la vista sin
   recargar. Cubre la fase de grupos (la fase activa). Si no hay
   conexión o falla, conserva los datos guardados (no rompe nada).
   Se usa en web/PWA/Electron; en file:// puede no permitir el
   fetch entre orígenes y degrada silenciosamente.
   ============================================================= */
(function (global) {
  "use strict";

  const API = "https://en.wikipedia.org/w/api.php";

  // EN -> ES (debe coincidir con los nombres del dataset)
  const EN_ES = {
    "mexico": "México", "south africa": "Sudáfrica", "south korea": "Corea del Sur",
    "korea republic": "Corea del Sur", "czech republic": "República Checa", "czechia": "República Checa",
    "canada": "Canadá", "bosnia and herzegovina": "Bosnia y Herzegovina", "qatar": "Catar",
    "switzerland": "Suiza", "brazil": "Brasil", "morocco": "Marruecos", "haiti": "Haití",
    "scotland": "Escocia", "united states": "Estados Unidos", "usa": "Estados Unidos",
    "paraguay": "Paraguay", "australia": "Australia", "turkey": "Turquía", "turkiye": "Turquía",
    "germany": "Alemania", "curacao": "Curazao", "ivory coast": "Costa de Marfil",
    "cote d'ivoire": "Costa de Marfil", "ecuador": "Ecuador", "netherlands": "Países Bajos",
    "japan": "Japón", "sweden": "Suecia", "tunisia": "Túnez", "belgium": "Bélgica",
    "egypt": "Egipto", "iran": "Irán", "ir iran": "Irán", "new zealand": "Nueva Zelanda",
    "spain": "España", "cape verde": "Cabo Verde", "cabo verde": "Cabo Verde",
    "saudi arabia": "Arabia Saudita", "uruguay": "Uruguay", "france": "Francia", "senegal": "Senegal",
    "iraq": "Irak", "norway": "Noruega", "argentina": "Argentina", "algeria": "Argelia",
    "austria": "Austria", "jordan": "Jordania", "portugal": "Portugal", "dr congo": "RD Congo",
    "congo dr": "RD Congo", "uzbekistan": "Uzbekistán", "colombia": "Colombia",
    "england": "Inglaterra", "croatia": "Croacia", "ghana": "Ghana", "panama": "Panamá",
  };

  const strip = (s) => (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const toES = (n) => EN_ES[strip(n)] || (n || "").trim();
  const SCORE_RE = /^\s*(\d+)\s*[–\-−]\s*(\d+)\s*$/;

  let enCurso = false;
  let ultima = null;

  async function fetchGroup(letter) {
    const url = API + "?action=parse&page=2026_FIFA_World_Cup_Group_" + letter +
      "&prop=text&format=json&formatversion=2&origin=*";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const html = data && data.parse && data.parse.text;
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out = [];
    doc.querySelectorAll(".footballbox").forEach((box) => {
      const t = (sel) => { const e = box.querySelector(sel); return e ? e.textContent.trim() : ""; };
      const home = toES(t(".fhome"));
      const away = toES(t(".faway"));
      const m = t(".fscore").replace(/ /g, " ").match(SCORE_RE);
      if (home && away && m) out.push({ home, away, gl: +m[1], gv: +m[2] });
    });
    return out;
  }

  // Grupos con algún partido ya jugado (según reloj) pero aún sin marcador en el dataset.
  function gruposPendientes() {
    const now = Date.now();
    const set = new Set();
    global.WCData.all().forEach((p) => {
      if (p.fase === "Fase de grupos" && p.resultadoLocal == null &&
          p._instante && p._instante.getTime() <= now) {
        set.add(p.grupo);
      }
    });
    return [...set];
  }

  function aplicar(scores) {
    let nuevos = 0;
    const todos = global.WCData.all();
    scores.forEach((s) => {
      const a = strip(s.home), b = strip(s.away);
      const p = todos.find((x) =>
        x.fase === "Fase de grupos" &&
        ((strip(x.local) === a && strip(x.visitante) === b) ||
         (strip(x.local) === b && strip(x.visitante) === a)));
      if (!p) return;
      const gl = strip(p.local) === a ? s.gl : s.gv;
      const gv = strip(p.local) === a ? s.gv : s.gl;
      if (p.resultadoLocal !== gl || p.resultadoVisitante !== gv) {
        p.resultadoLocal = gl;
        p.resultadoVisitante = gv;
        p.resultadoVerificado = true;
        p._estado = global.WCData.computeEstado(p);
        nuevos++;
      }
    });
    return nuevos;
  }

  async function refresh(full) {
    if (enCurso || !global.WCData || !global.WCData.isLoaded()) return;
    if (!navigator.onLine) { setStatus("offline"); return; }
    enCurso = true;
    setStatus("loading");
    try {
      const letras = full ? "ABCDEFGHIJKL".split("") : gruposPendientes();
      if (!letras.length) { setStatus("ok", 0); return; }
      let nuevos = 0;
      for (const L of letras) {
        try {
          nuevos += aplicar(await fetchGroup(L));
        } catch (e) { /* salta este grupo (rate limit / red) */ }
        await new Promise((r) => setTimeout(r, 250)); // cortesía con la API
      }
      ultima = new Date();
      if (nuevos > 0 && global.WCApp && global.WCApp.rerenderAll) global.WCApp.rerenderAll();
      setStatus("ok", nuevos);
    } catch (e) {
      setStatus("error");
    } finally {
      enCurso = false;
    }
  }

  function setStatus(state, nuevos) {
    const el = document.getElementById("liveStatus");
    const icon = document.getElementById("liveIcon");
    if (icon) icon.classList.toggle("spin", state === "loading");
    if (!el) return;
    el.hidden = false;
    const hora = (ultima || new Date()).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (state === "loading") { el.className = "live-status is-loading"; el.textContent = "Actualizando…"; }
    else if (state === "offline") { el.className = "live-status is-off"; el.textContent = "○ Sin conexión · datos guardados"; }
    else if (state === "error") { el.className = "live-status is-off"; el.textContent = "○ Sin conexión con la fuente"; }
    else { el.className = "live-status is-live"; el.textContent = "● En vivo · " + hora + (nuevos ? " (+" + nuevos + ")" : ""); }
  }

  global.WCLive = { refresh };
})(window);
