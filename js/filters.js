/* =============================================================
   filters.js — Estado de filtros + búsqueda
   -------------------------------------------------------------
   Centraliza los criterios activos (fase, grupo, equipo, sede y
   texto de búsqueda) y aplica el filtrado sobre la lista de
   partidos. Las vistas se suscriben mediante un callback.
   ============================================================= */
(function (global) {
  "use strict";

  const state = { fase: "", grupo: "", equipo: "", sede: "", q: "" };
  let onChange = function () {};

  /** Normaliza texto: minúsculas y sin acentos (para búsquedas tolerantes). */
  function norm(s) {
    return (s || "")
      .toString()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  }

  function set(key, value) {
    state[key] = value;
    onChange(getActive());
  }

  function clear() {
    state.fase = state.grupo = state.equipo = state.sede = state.q = "";
    syncControls();
    onChange(getActive());
  }

  function getActive() {
    return Object.assign({}, state);
  }

  /** Aplica todos los filtros a la lista global de partidos. */
  function apply(partidos) {
    const q = norm(state.q);
    return partidos.filter((p) => {
      if (state.fase && p.fase !== state.fase) return false;
      if (state.grupo && p.grupo !== state.grupo) return false;
      if (state.sede && p.ciudad !== state.sede) return false;
      if (state.equipo && p.local !== state.equipo && p.visitante !== state.equipo) return false;
      if (q) {
        const hay = norm(p.local + " " + p.visitante + " " + p.ciudad + " " + p.estadio + " " + (p.grupo || ""));
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /* ---------- Construcción de los <select> y eventos ---------- */
  function fillSelect(el, items, allLabel) {
    el.innerHTML =
      `<option value="">${allLabel}</option>` +
      items.map((v) => `<option value="${v}">${v}</option>`).join("");
  }

  function syncControls() {
    document.getElementById("filterFase").value = state.fase;
    document.getElementById("filterGrupo").value = state.grupo;
    document.getElementById("filterEquipo").value = state.equipo;
    document.getElementById("filterSede").value = state.sede;
    document.getElementById("searchInput").value = state.q;
  }

  function mount(changeCb) {
    onChange = changeCb || onChange;

    fillSelect(document.getElementById("filterFase"), global.WCData.phases(), "Todas las fases");
    fillSelect(
      document.getElementById("filterGrupo"),
      global.WCData.groups().map((g) => g.grupo).filter((g) => g && g !== "?").sort(),
      "Todos los grupos"
    );
    fillSelect(document.getElementById("filterEquipo"), global.WCData.teams(), "Todas las selecciones");
    fillSelect(document.getElementById("filterSede"), global.WCData.cities(), "Todas las sedes");

    document.getElementById("filterFase").addEventListener("change", (e) => set("fase", e.target.value));
    document.getElementById("filterGrupo").addEventListener("change", (e) => set("grupo", e.target.value));
    document.getElementById("filterEquipo").addEventListener("change", (e) => set("equipo", e.target.value));
    document.getElementById("filterSede").addEventListener("change", (e) => set("sede", e.target.value));

    let t;
    document.getElementById("searchInput").addEventListener("input", (e) => {
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => set("q", v), 140); // debounce
    });

    document.getElementById("clearFilters").addEventListener("click", clear);
  }

  global.WCFilters = { mount, apply, getActive, set, clear, norm };
})(window);
