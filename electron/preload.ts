console.log("[preload] running");
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("clipster", {
  list: (query?: string) => ipcRenderer.invoke("history:list", query),
  clear: () => ipcRenderer.invoke("history:clear"),
  remove: (id: string) => ipcRenderer.invoke("history:delete", id),
  setClipboard: (payload: { kind: "text" | "image"; value: string }) => ipcRenderer.invoke("clipboard:set", payload),
  onHistoryUpdated: (cb: () => void) => {
    const listener = () => cb();
    ipcRenderer.on("history:updated", listener);
    return () => ipcRenderer.removeListener("history:updated", listener);
  }
});
