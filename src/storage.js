// ============================================================
// Storage adapter — all persistence goes through this file.
//
//   get(key, shared)     -> { key, value, shared } | null
//   set(key, value, shared)  -> { key, value, shared }
//   delete(key, shared)  -> { key, deleted, shared }
//   list(prefix, shared) -> { keys, prefix, shared }
//
// SHARED data (posts, members): Supabase when VITE_SUPABASE_URL
// and VITE_SUPABASE_ANON_KEY are set — otherwise localStorage
// (demo mode: data stays in this browser only).
//
// PERSONAL data (your profile): always localStorage — your
// identity lives on your device. Real auth is on the roadmap.
// ============================================================
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLive = Boolean(url && anonKey);
const supabase = isLive ? createClient(url, anonKey) : null;

if (!isLive) {
  console.warn(
    "[founders-hub] DEMO MODE: no Supabase env vars found — shared data will only exist in this browser. See DEPLOYMENT.md."
  );
}

// ---------- localStorage fallback ----------
const PREFIX = "f26hub:";
const lk = (key, shared) => `${PREFIX}${shared ? "shared" : "personal"}:${key}`;

const local = {
  async get(key, shared) {
    const v = localStorage.getItem(lk(key, shared));
    return v === null ? null : { key, value: v, shared };
  },
  async set(key, value, shared) {
    localStorage.setItem(lk(key, shared), value);
    return { key, value, shared };
  },
  async delete(key, shared) {
    localStorage.removeItem(lk(key, shared));
    return { key, deleted: true, shared };
  },
  async list(prefix, shared) {
    const scope = `${PREFIX}${shared ? "shared" : "personal"}:`;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const full = localStorage.key(i);
      if (full.startsWith(scope + prefix)) keys.push(full.slice(scope.length));
    }
    return { keys, prefix, shared };
  },
};

// ---------- public API ----------
export const storage = {
  async get(key, shared = false) {
    if (!shared || !supabase) return local.get(key, shared);
    const { data, error } = await supabase.from("kv_store").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return data ? { key, value: data.value, shared } : null;
  },
  async set(key, value, shared = false) {
    if (!shared || !supabase) return local.set(key, value, shared);
    const { error } = await supabase
      .from("kv_store")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { key, value, shared };
  },
  async delete(key, shared = false) {
    if (!shared || !supabase) return local.delete(key, shared);
    const { error } = await supabase.from("kv_store").delete().eq("key", key);
    if (error) throw error;
    return { key, deleted: true, shared };
  },
  async list(prefix = "", shared = false) {
    if (!shared || !supabase) return local.list(prefix, shared);
    const { data, error } = await supabase.from("kv_store").select("key").like("key", `${prefix}%`);
    if (error) throw error;
    return { keys: data.map((r) => r.key), prefix, shared };
  },
};
