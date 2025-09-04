import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Entry = {
  id: string;
  kind: "text" | "image";
  value: string;      // text or dataURL
  createdAt: number;  // epoch ms
  pinned?: boolean;
};

export class Storage {
  private fp: string;
  private maxItems = 200;

  constructor(userDataPath: string) {
    this.fp = path.join(userDataPath, "history.json");
  }

  async init() {
    try {
      await fs.access(this.fp);
    } catch {
      await fs.writeFile(this.fp, "[]", "utf8");
    }
  }

  async list(query?: string): Promise<Entry[]> {
    const all = await this.readAll();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(e => (e.kind === "text" ? e.value.toLowerCase().includes(q) : false));
  }

  async addEntry(input: Omit<Entry, "id" | "createdAt">) {
    const all = await this.readAll();

    // De-dupe (front-load latest)
    const withoutDup = all.filter(e => !(e.kind === input.kind && e.value === input.value));

    const entry: Entry = {
      id: randomUUID(),
      createdAt: Date.now(),
      ...input
    };

    const next = [entry, ...withoutDup].slice(0, this.maxItems);
    await this.writeAll(next);
    return entry;
  }

  async remove(id: string) {
    const all = await this.readAll();
    const next = all.filter(e => e.id !== id);
    await this.writeAll(next);
  }

  async clear() {
    await this.writeAll([]);
  }

  private async readAll(): Promise<Entry[]> {
    const raw = await fs.readFile(this.fp, "utf8");
    try {
      const arr = JSON.parse(raw) as Entry[];
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      await fs.writeFile(this.fp, "[]", "utf8");
      return [];
    }
  }

  private async writeAll(entries: Entry[]) {
    await fs.writeFile(this.fp, JSON.stringify(entries, null, 2), "utf8");
  }
}
