import { app, BrowserWindow, ipcMain, clipboard, nativeImage, Notification, globalShortcut } from "electron";
import path from "node:path";
import fs from "node:fs";
import { createTray } from "./tray";
import { Storage } from "./storage";

let win: BrowserWindow | null = null;
let tray = null as ReturnType<typeof createTray> | null;
const storage = new Storage(app.getPath("userData"));
const isDev = !app.isPackaged;

function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, "preload.cjs"), // compiled preload
    path.resolve(process.cwd(), "electron","dist", "preload.cjs"), // dev preload
    path.resolve(app.getAppPath(), "electron","dist", "preload.cjs"), // packaged preload
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  } 
  return candidates[0]; // fallback
}

async function createWindow() {
  const preloadPath = resolvePreloadPath();
  console.log("[main] Using preload:", preloadPath, "exists:", fs.existsSync(preloadPath));

  win = new BrowserWindow({
    width: 520,
    height: 680,
    minWidth: 480,
    minHeight: 560,
    title: "Clipster",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });

    // Log if preload throws
  win.webContents.on("preload-error", (_event, preloadPath2, error) => {
    console.error("[main] preload-error:", preloadPath2, error);
  });
  
  if (isDev) {
    await win.loadURL("http://localhost:5173/");
    // win.webContents.openDevTools({ mode: "detach" });
  } else {
    const htmlPath = path.resolve(app.getAppPath(), "renderer", "dist", "index.html");
    await win.loadFile(htmlPath);
  }

  win.webContents.on("dom-ready", () => console.log("[main] renderer dom-ready"));
  win.webContents.on("did-finish-load", () => console.log("[main] renderer did-finish-load"));
}

app.whenReady().then(async () => {
  if (process.platform === "win32") app.setAppUserModelId("Clipster");

  await storage.init();
  await createWindow();

  tray = createTray(() => {
    if (!win) createWindow();
    else { win.isVisible() ? win.hide() : win.show(); }
  });

  // Global shortcut to bring up the window
  const ok = globalShortcut.register("CommandOrControl+Shift+V", () => {
    if (!win) return;
    win.show();
    win.focus();
  });
  if (!ok) console.warn("Global shortcut registration failed");

  // Start clipboard polling
  startClipboardWatcher();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- Clipboard Watcher ---
let lastText = "";
let lastImageHash = "";
const POLL_MS = 800;

function startClipboardWatcher() {
  setInterval(async () => {
    // Prefer text; if none, consider images
    const text = clipboard.readText();
    if (text && text !== lastText) {
      lastText = text;
      await storage.addEntry({ kind: "text", value: text });
      notify("Copied text saved");
      win?.webContents.send("history:updated");
      return;
    }

    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      const dataURL = img.toDataURL(); // simple hashing
      if (dataURL && dataURL !== lastImageHash) {
        lastImageHash = dataURL;
        await storage.addEntry({ kind: "image", value: dataURL });
        notify("Copied image saved");
        win?.webContents.send("history:updated");
      }
    }
  }, POLL_MS);
}

function notify(body: string) {
  if (Notification.isSupported()) {
    new Notification({ title: "Clipster", body }).show();
  }
}

// --- IPC ---
ipcMain.handle("history:list", async (_e, query?: string) => {
  return storage.list(query);
});

ipcMain.handle("history:clear", async () => {
  await storage.clear();
  return true;
});

ipcMain.handle("history:delete", async (_e, id: string) => {
  await storage.remove(id);
  return true;
});

ipcMain.handle("clipboard:set", async (_e, payload: { kind: "text" | "image"; value: string }) => {
  if (payload.kind === "text") clipboard.writeText(payload.value);
  else clipboard.writeImage(nativeImage.createFromDataURL(payload.value));
  return true;
});
