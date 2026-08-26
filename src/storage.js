// ============================================================
// Storage adapter — the ONE place contributors swap in a backend.
//
// The app was born as a Claude artifact using window.storage
// (a shared key-value store). This adapter keeps the same API:
//
//   get(key, shared)    -> { key, value, shared } | null
//   set(key, value, shared) -> { key, value, shared }
//   delete(key, shared) -> { key, deleted, shared }
//   list(prefix, shared)-> { keys, prefix, shared }
//
// Current implementation: localStorage = DEMO MODE.
// Everything works, but data lives only in YOUR browser —
// it is NOT shared between users yet.
//
// 👉 Contributor quest #1: implement this same interface on a
// real backend (Supabase is a great fit: free tier, Postgres,
// realtime, auth). See README "Roadmap".
// ============================================================

const PREFIX = "f26hub:";
const k = (key, shared) => `${PREFIX}${shared ? "shared" : "personal"}:${key}`;

export const storage = {
  async get(key, shared = false) {
    const v = localStorage.getItem(k(key, shared));
    return v === null ? null : { key, value: v, shared };
  },
  async set(key, value, shared = false) {
    localStorage.setItem(k(key, shared), value);
    return { key, value, shared };
  },
  async delete(key, shared = false) {
    localStorage.removeItem(k(key, shared));
    return { key, deleted: true, shared };
  },
  async list(prefix = "", shared = false) {
    const scope = `${PREFIX}${shared ? "shared" : "personal"}:`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (full.startsWith(scope + prefix)) keys.push(full.slice(scope.length));
    }
    return { keys, prefix, shared };
  },
};
