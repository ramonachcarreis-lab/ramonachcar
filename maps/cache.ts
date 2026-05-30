import fs from 'fs';
import path from 'path';

type CacheEntry<T> = { at: number; data: T };

const CACHE_PATH = path.join(process.cwd(), 'server', 'data', 'maps-cache.json');
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Store = Record<string, CacheEntry<unknown>>;

let memory: Store = {};
let lastNominatimAt = 0;

function load(): Store {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      memory = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as Store;
    }
  } catch {
    memory = {};
  }
  return memory;
}

function persist(): void {
  try {
    const dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(memory, null, 0));
  } catch (e) {
    console.warn('[maps-cache] persist failed', e);
  }
}

load();

export function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = memory[key] as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    delete memory[key];
    return null;
  }
  return entry.data;
}

export function cacheSet<T>(key: string, data: T): void {
  memory[key] = { at: Date.now(), data };
  persist();
}

/** Nominatim exige ~1 req/s — fila simples no servidor. */
export async function waitNominatimSlot(): Promise<void> {
  const minGap = 1100;
  const now = Date.now();
  const wait = Math.max(0, minGap - (now - lastNominatimAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimAt = Date.now();
}
