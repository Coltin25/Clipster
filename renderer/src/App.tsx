import { useEffect, useState } from "react";

type Entry = {
  id: string;
  kind: "text" | "image";
  value: string;
  createdAt: number;
  pinned?: boolean;
};

declare global {
  interface Window {
    clipster: {
      list: (query?: string) => Promise<Entry[]>;
      clear: () => Promise<boolean>;
      remove: (id: string) => Promise<boolean>;
      setClipboard: (payload: { kind: "text" | "image"; value: string }) => Promise<boolean>;
      onHistoryUpdated: (cb: () => void) => () => void;
    };
  }
}

export default function App() {
  const [items, setItems] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");

  const hasBridge = typeof window.clipster !== "undefined";

  const reload = async () => {
    if (!hasBridge) return;
    const res = await window.clipster!.list(query || undefined);
    setItems(res);
  };

  useEffect(() => {
    if (!hasBridge) return;
    reload();
    const off = window.clipster!.onHistoryUpdated(() => reload());
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBridge]);

  useEffect(() => {
    if (!hasBridge) return;
    const t = setTimeout(reload, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, hasBridge]);

    if (!hasBridge) {
    return (
      <div style={{ padding: 14, fontFamily: "Inter, system-ui, sans-serif" }}>
        <h1>Clipster</h1>
        <p style={{ color: "#a00" }}>
          Preload bridge not available. Make sure <code>electron/dist/preload.cjs</code> exists
          and your <code>BrowserWindow</code> points to it.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 14, fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Clipster</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          placeholder="Search text…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <button onClick={reload} style={btn}>Refresh</button>
        <button onClick={() => { if (confirm("Clear all history?")) window.clipster.clear().then(reload); }} style={{...btn, background:'#f6d5d5', borderColor:'#d99'}}>Clear</button>
      </div>

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
        {items.map(e => (
          <li key={e.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <small style={{ color: "#666" }}>{new Date(e.createdAt).toLocaleString()}</small>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={btnSmall}
                  title="Copy back to clipboard"
                  onClick={() => window.clipster.setClipboard({ kind: e.kind, value: e.value })}
                >
                  Copy
                </button>
                <button
                  style={{ ...btnSmall, background: "#f0e0e0", borderColor: "#d9b" }}
                  title="Delete"
                  onClick={() => window.clipster.remove(e.id).then(reload)}
                >
                  Delete
                </button>
              </div>
            </div>

            {e.kind === "text" ? (
              <pre style={pre}>{e.value}</pre>
            ) : (
              <img src={e.value} alt="clip" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 8 }} />
            )}
          </li>
        ))}
        {items.length === 0 && <p>No items yet. Copy something to get started!</p>}
      </ul>
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fafafa",
  cursor: "pointer"
};

const btnSmall: React.CSSProperties = { ...btn, padding: "6px 10px", fontSize: 12 };

const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 12,
  background: "white",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
};

const pre: React.CSSProperties = {
  marginTop: 8,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: "#fafafa",
  border: "1px solid #eee",
  borderRadius: 8,
  padding: 8
};
