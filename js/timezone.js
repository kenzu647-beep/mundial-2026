/* =============================================================
   timezone.js — Conversión de husos horarios
   -------------------------------------------------------------
   Cada partido se guarda con su hora "de pared" en la sede
   (horaLocal) + la zona IANA del estadio (zonaHoraria). Desde
   ahí calculamos el instante absoluto (UTC) y lo reproyectamos
   a la zona local del usuario usando la API Intl del navegador.
   No dependemos de librerías externas.
   ============================================================= */
(function (global) {
  "use strict";

  /**
   * Diferencia (en ms) entre una zona IANA y UTC para un instante dado.
   * Maneja automáticamente el horario de verano (DST).
   */
  function tzOffsetMs(timeZone, date) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(date).reduce((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});
    // 'hour' puede venir como "24" a medianoche en algunos motores → normaliza
    let hour = parseInt(parts.hour, 10) % 24;
    const asUTC = Date.UTC(
      +parts.year, +parts.month - 1, +parts.day,
      hour, +parts.minute, +parts.second
    );
    return asUTC - date.getTime();
  }

  /**
   * Convierte una hora local de la sede a un objeto Date (instante UTC real).
   * @param {string} dateStr  'YYYY-MM-DD'
   * @param {string} timeStr  'HH:MM' (24h) — puede ser null
   * @param {string} timeZone zona IANA, p.ej. 'America/Mexico_City'
   * @returns {Date|null}
   */
  function venueWallTimeToDate(dateStr, timeStr, timeZone) {
    if (!dateStr || !timeStr || !timeZone) return null;
    const [Y, M, D] = dateStr.split("-").map(Number);
    const [h, m] = timeStr.split(":").map(Number);
    if ([Y, M, D, h, m].some((n) => Number.isNaN(n))) return null;

    // Primer estimado tratando la hora de pared como si fuera UTC
    const guess = new Date(Date.UTC(Y, M - 1, D, h, m, 0));
    // Corrige con el offset real de la zona en ese instante
    const offset = tzOffsetMs(timeZone, guess);
    return new Date(guess.getTime() - offset);
  }

  /** Formatea un Date en una zona concreta. */
  function formatInZone(date, timeZone, opts) {
    if (!date) return "—";
    return new Intl.DateTimeFormat("es-ES", Object.assign({ timeZone }, opts)).format(date);
  }

  /** Hora corta (HH:MM) en una zona dada. */
  function timeInZone(date, timeZone) {
    return formatInZone(date, timeZone, { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  /** Etiqueta de offset tipo "GMT-6" para una zona/instante. */
  function offsetLabel(date, timeZone) {
    if (!date) return "";
    const s = new Intl.DateTimeFormat("en-US", {
      timeZone, timeZoneName: "shortOffset", hour: "2-digit",
    }).formatToParts(date).find((p) => p.type === "timeZoneName");
    return s ? s.value : "";
  }

  /** Lista curada de zonas frecuentes para el selector (además de la del usuario). */
  const COMMON_ZONES = [
    "America/Mexico_City",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Bogota",
    "America/Lima",
    "America/Argentina/Buenos_Aires",
    "America/Santiago",
    "America/Sao_Paulo",
    "Europe/Madrid",
    "Europe/London",
    "Europe/Paris",
    "Africa/Casablanca",
    "Asia/Tokyo",
    "Australia/Sydney",
    "UTC",
  ];

  /** Zona detectada del navegador. */
  function userZone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch (e) {
      return "UTC";
    }
  }

  global.TZ = {
    venueWallTimeToDate,
    formatInZone,
    timeInZone,
    offsetLabel,
    tzOffsetMs,
    userZone,
    COMMON_ZONES,
  };
})(window);
