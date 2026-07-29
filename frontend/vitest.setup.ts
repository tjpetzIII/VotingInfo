import "@testing-library/jest-dom/vitest";

// Node's own global `localStorage`/`sessionStorage` (unconfigured Web Storage, requires
// --localstorage-file) shadows jsdom's implementation in this environment. Replace both with a
// simple in-memory polyfill so `localStorage` behaves the same in tests as it does in a browser.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

for (const key of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: new MemoryStorage(),
  });
}
