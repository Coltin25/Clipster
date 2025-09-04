import { Menu, Tray, nativeImage, app, BrowserWindow } from "electron";
import path from "node:path";
import fs from "node:fs";

function resolveIconPath(): string | null {
  // Running from electron/dist/main.cjs (so __dirname === electron/dist)
  const candidates = [
    // dev path (relative to compiled main)
    path.resolve(__dirname, "..", "renderer", "public", "icon.png"),
    // dev path (from project root)
    path.resolve(process.cwd(), "renderer", "public", "icon.png"),
    // prod path (packaged apps often place assets under resources)
    path.join(process.resourcesPath || "", "assets", "icon.png"),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function fallbackImage() {
  // a tiny 16x16 transparent PNG (base64). Replace later with your own icon.
  const dataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAE0lEQVQ4T2P8z8AARMAgGGEAAGWlAqI0R9GqAAAAAElFTkSuQmCC";
  return nativeImage.createFromDataURL(dataUrl);
}

export function createTray(toggleWindow: () => void) {
  let icon = null as Electron.NativeImage | null;
  const iconPath = resolveIconPath();
  if (iconPath) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) icon = img;
  }
  if (!icon || icon.isEmpty()) {
    // Fallback so the app won’t crash; swap this for a real icon asap.
    icon = fallbackImage();
  }

  const tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show/Hide", click: toggleWindow },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setToolTip("Clipster");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) (w.isVisible() ? w.hide() : w.show());
  });

  return tray;
}

