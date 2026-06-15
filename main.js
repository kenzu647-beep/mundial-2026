/* =============================================================
   main.js — Proceso principal de Electron
   -------------------------------------------------------------
   Empaqueta la app web (index.html) como aplicación de escritorio.
   - Carga index.html (los datos viven en data/datos.js).
   - Abre los enlaces externos (fuentes) en el navegador del sistema.
   - Las descargas (.ics/.json) usan el diálogo "Guardar como" nativo.
   ============================================================= */
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: "#0e1117",
    title: "Mundial 2026 — Calendario interactivo",
    autoHideMenuBar: true, // oculta la barra de menú (se muestra con Alt)
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Menú mínimo en español (Archivo / Ver)
  const menu = Menu.buildFromTemplate([
    {
      label: "Archivo",
      submenu: [{ role: "quit", label: "Salir" }],
    },
    {
      label: "Ver",
      submenu: [
        { role: "reload", label: "Recargar" },
        { role: "toggleDevTools", label: "Herramientas de desarrollo" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom normal" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Pantalla completa" },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  win.loadFile(path.join(__dirname, "index.html"));

  // Los enlaces con target=_blank (fuentes) se abren en el navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
