/* =============================================================
   data.js — Carga y normalización de los datos del Mundial 2026
   -------------------------------------------------------------
   Lee window.WC2026 (definido en data/datos.js, generado por el
   scraping). Enriquece cada partido con: instante UTC, estado
   dinámico (programado / en vivo / finalizado / por confirmar)
   y banderas. Expone helpers de consulta para las vistas.
   ============================================================= */
(function (global) {
  "use strict";

  /* Banderas (emoji) por selección, en español. */
  const FLAGS = {
    "México": "🇲🇽", "Sudáfrica": "🇿🇦", "Corea del Sur": "🇰🇷", "República Checa": "🇨🇿",
    "Canadá": "🇨🇦", "Bosnia y Herzegovina": "🇧🇦", "Catar": "🇶🇦", "Suiza": "🇨🇭",
    "Brasil": "🇧🇷", "Marruecos": "🇲🇦", "Haití": "🇭🇹", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    "Estados Unidos": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turquía": "🇹🇷",
    "Alemania": "🇩🇪", "Curazao": "🇨🇼", "Costa de Marfil": "🇨🇮", "Ecuador": "🇪🇨",
    "Países Bajos": "🇳🇱", "Japón": "🇯🇵", "Suecia": "🇸🇪", "Túnez": "🇹🇳",
    "Bélgica": "🇧🇪", "Egipto": "🇪🇬", "Irán": "🇮🇷", "Nueva Zelanda": "🇳🇿",
    "España": "🇪🇸", "Cabo Verde": "🇨🇻", "Arabia Saudita": "🇸🇦", "Uruguay": "🇺🇾",
    "Francia": "🇫🇷", "Senegal": "🇸🇳", "Irak": "🇮🇶", "Noruega": "🇳🇴",
    "Argentina": "🇦🇷", "Argelia": "🇩🇿", "Austria": "🇦🇹", "Jordania": "🇯🇴",
    "Portugal": "🇵🇹", "RD Congo": "🇨🇩", "Uzbekistán": "🇺🇿", "Colombia": "🇨🇴",
    "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croacia": "🇭🇷", "Ghana": "🇬🇭", "Panamá": "🇵🇦",
  };

  const LIVE_WINDOW_MS = 2.5 * 60 * 60 * 1000; // ~duración de un partido

  /** ¿El nombre es un marcador de posición de eliminatorias (1A, Ganador 73…)? */
  function isPlaceholder(name) {
    if (!name) return true;
    if (FLAGS[name]) return false;
    return /\d|ganador|perdedor|tercero|mejor|grupo|\/|—|por definir/i.test(name);
  }

  function flag(name) {
    if (FLAGS[name]) return FLAGS[name];
    return isPlaceholder(name) ? "🔡" : "🏳️";
  }

  /** Estado dinámico del partido según el reloj real y los resultados. */
  function computeEstado(p) {
    const tieneResultado = p.resultadoLocal != null && p.resultadoVisitante != null;
    if (tieneResultado) return "finalizado";
    if (!p._instante) return p.estado === "por confirmar" ? "por confirmar" : "programado";

    const now = Date.now();
    const ko = p._instante.getTime();
    if (now < ko) return "programado";
    if (now < ko + LIVE_WINDOW_MS) return "en vivo";
    return "por confirmar"; // ya debió jugarse pero no hay marcador verificado
  }

  let DATA = null;

  function init() {
    const raw = global.WC2026;
    if (!raw || !Array.isArray(raw.partidos)) {
      DATA = { meta: null, grupos: [], sedes: [], partidos: [], loaded: false };
      return DATA;
    }

    // Mapa ciudad → zona horaria a partir de las sedes (para los partidos).
    const zoneByCity = {};
    (raw.sedes || []).forEach((s) => {
      if (s.ciudad) zoneByCity[s.ciudad] = s.zonaHoraria;
    });

    const partidos = raw.partidos.map((p, i) => {
      const tz = p.zonaHoraria || zoneByCity[p.ciudad] || "UTC";
      const instante = global.TZ.venueWallTimeToDate(p.fecha, p.horaLocal, tz);
      const enriched = Object.assign({}, p, {
        _idx: i,
        zonaHoraria: tz,
        _instante: instante,
        _localFlag: flag(p.local),
        _visitFlag: flag(p.visitante),
        _localPlaceholder: isPlaceholder(p.local),
        _visitPlaceholder: isPlaceholder(p.visitante),
      });
      enriched._estado = computeEstado(enriched);
      return enriched;
    });

    DATA = {
      meta: raw._meta || null,
      grupos: raw.grupos || [],
      sedes: raw.sedes || [],
      partidos,
      loaded: true,
    };
    return DATA;
  }

  /* ----------------- Helpers de consulta ----------------- */
  const all = () => (DATA ? DATA.partidos : []);

  function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }

  function phases() {
    // Orden lógico del torneo
    const order = ["Fase de grupos", "Dieciseisavos", "Octavos", "Cuartos", "Semifinales", "Semifinales/Final", "Tercer lugar", "Final"];
    const present = uniqueSorted(all().map((p) => p.fase));
    return present.sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }

  function teams() {
    const set = new Set();
    all().forEach((p) => {
      if (!isPlaceholder(p.local)) set.add(p.local);
      if (!isPlaceholder(p.visitante)) set.add(p.visitante);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }

  const cities = () => uniqueSorted(all().map((p) => p.ciudad));
  const groups = () => (DATA ? DATA.grupos : []);
  const sedes = () => (DATA ? DATA.sedes : []);
  const meta = () => (DATA ? DATA.meta : null);
  const isLoaded = () => !!(DATA && DATA.loaded);

  /** Partidos de un equipo concreto (incluye eliminatorias donde aparezca). */
  function matchesOfTeam(team) {
    return all().filter((p) => p.local === team || p.visitante === team);
  }

  global.WCData = {
    init, all, phases, teams, cities, groups, sedes, meta, isLoaded,
    matchesOfTeam, flag, isPlaceholder, computeEstado,
  };
})(window);
