import { useState, useEffect, useCallback } from "react";
import { storage } from "./storage";

// ================= CONFIG =================
// Share this code ONLY in your subreddit thread / DMs.
// Ask Claude to change it anytime before publishing.
const INVITE_CODE = import.meta.env.VITE_INVITE_CODE || "F26-BUILD";
// Batch is configurable — future batches just change these env vars.
// Each batch label gets its own fresh board (storage keys are namespaced).
const BATCH_LABEL = import.meta.env.VITE_BATCH_LABEL || "F26";
const BATCH_NAME = import.meta.env.VITE_BATCH_NAME || "YC Fall 2026";

// ---------- Design tokens (modern Hacker News homage) ----------
const C = {
  bg: "#F6F6EF",
  card: "#FFFFFF",
  ink: "#1C1C17",
  sub: "#6E6E62",
  line: "#E4E2D6",
  orange: "#FF6600",
  orangeDark: "#D95400",
};

const STATUSES = [
  { id: "applied", label: "Applied", color: "#B45309", bg: "#FEF3C7" },
  { id: "interviewing", label: "Interviewing", color: "#1D4ED8", bg: "#DBEAFE" },
  { id: "accepted", label: "Accepted 🎉", color: "#15803D", bg: "#DCFCE7" },
  { id: "rejected", label: "Not this batch", color: "#52525B", bg: "#E4E4E7" },
  { id: "building", label: "Building anyway", color: "#6D28D9", bg: "#EDE9FE" },
];

const CHANNELS = [
  { id: "applications", label: "Applications", emoji: "📋", blurb: "Questions, tips and timelines for the F26 app." },
  { id: "interviews", label: "Interviews", emoji: "🎤", blurb: "Prep, mock questions, and post-interview debriefs." },
  { id: "results", label: "Results", emoji: "📣", blurb: "Who's heard back? Share the news — good or bad." },
  { id: "cofounders", label: "Co-founder search", emoji: "🤝", blurb: "Find your other half. Post what you're building and who you need." },
  { id: "build", label: "Build & help", emoji: "🛠️", blurb: "Get unblocked: product, tech, growth, fundraising." },
  { id: "general", label: "General", emoji: "💬", blurb: "Everything else. Wins, rants, memes, life." },
];

const INTRO_POST = {
  id: "pinned_intro",
  pinned: true,
  title: "👋 Introduce yourself — who are you and what are you building?",
  body: "Welcome to the Founders Hub! Reply below with:\n\n1. Your name / handle\n2. What you're building (one line)\n3. Where you are in the batch journey\n4. One thing you could use help with\n\nThis group is for the long run — deadline or no deadline, we keep building together. 🧡",
  author: "hub",
  status: "building",
  ts: 0,
  upvotes: [],
  replies: [],
};

const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
const chanOf = (id) => CHANNELS.find((c) => c.id === id);
const chanKey = (id) => `${BATCH_LABEL}:board:${id}`;

function timeAgo(ts) {
  if (!ts) return "pinned";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

// ---------- Storage helpers ----------
async function loadChannel(id) {
  try {
    const r = await storage.get(chanKey(id), true);
    return r ? JSON.parse(r.value) : [];
  } catch {
    return [];
  }
}
async function saveChannel(id, posts) {
  try {
    await storage.set(chanKey(id), JSON.stringify(posts), true);
  } catch {}
}
async function loadMembers() {
  try {
    const r = await storage.get(`${BATCH_LABEL}:members`, true);
    return r ? JSON.parse(r.value) : {};
  } catch {
    return {};
  }
}
async function saveMembers(m) {
  try {
    await storage.set(`${BATCH_LABEL}:members`, JSON.stringify(m), true);
  } catch {}
}
async function loadProfile() {
  try {
    const r = await storage.get(`${BATCH_LABEL}:profile`);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function saveProfile(p) {
  try {
    await storage.set(`${BATCH_LABEL}:profile`, JSON.stringify(p));
  } catch {}
}

// ---------- UI atoms ----------
function Chip({ status, small }) {
  const s = statusOf(status);
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        padding: small ? "1px 7px" : "2px 9px",
        borderRadius: 999,
        whiteSpace: "nowrap",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        letterSpacing: "0.02em",
      }}
    >
      {s.label}
    </span>
  );
}

function Btn({ children, onClick, kind = "primary", disabled, style }) {
  const base = {
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "inherit",
    transition: "transform 0.06s ease",
    ...style,
  };
  const kinds = {
    primary: { background: C.orange, color: "#fff" },
    ghost: { background: "transparent", color: C.sub, border: `1px solid ${C.line}` },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...kinds[kind] }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.line}`,
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  fontFamily: "inherit",
  background: "#fff",
  color: C.ink,
  outline: "none",
};

// ---------- Onboarding (with invite gate) ----------
function Onboarding({ onDone }) {
  const [step, setStep] = useState(0); // 0 = code, 1 = profile
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState("");
  const [status, setStatus] = useState("applied");
  const [busy, setBusy] = useState(false);

  const tryCode = () => {
    if (code.trim().toUpperCase() === INVITE_CODE.toUpperCase()) {
      setStep(1);
    } else {
      setCodeErr("That code doesn't match. Grab the current one from the r/ycombinator batch thread.");
    }
  };

  const join = async () => {
    setBusy(true);
    const members = await loadMembers();
    const clean = name.trim();
    if (members[clean]) {
      setNameErr("That name is taken by another member — pick a different one.");
      setBusy(false);
      return;
    }
    members[clean] = { status, joinedAt: Date.now() };
    await saveMembers(members);
    await onDone({ name: clean, status });
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: "48px 20px" }}>
      <div style={{ fontFamily: "ui-monospace, Menlo, monospace", color: C.orange, fontSize: 12, fontWeight: 700, letterSpacing: "0.12em" }}>
        {BATCH_NAME.toUpperCase()}
      </div>
      <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "10px 0 8px", color: C.ink, letterSpacing: "-0.02em" }}>
        Founders Hub
      </h1>
      <p style={{ color: C.sub, fontSize: 14, lineHeight: 1.5, marginBottom: 28 }}>
        The always-on home for the r/ycombinator batch thread. Applied, interviewing, accepted or rejected — everyone keeps building together here.
      </p>

      {step === 0 && (
        <>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.ink, display: "block", marginBottom: 6 }}>
            Invite code
          </label>
          <input
            style={{ ...inputStyle, fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
            placeholder="Posted in the subreddit thread"
            value={code}
            onChange={(e) => { setCode(e.target.value); setCodeErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && code.trim() && tryCode()}
          />
          {codeErr && <div style={{ color: "#B91C1C", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{codeErr}</div>}
          <div style={{ marginTop: 20 }}>
            <Btn disabled={!code.trim()} onClick={tryCode} style={{ width: "100%", padding: "12px" }}>
              Continue →
            </Btn>
          </div>
          <p style={{ color: C.sub, fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
            This gate keeps the hub to people from the F26 application thread. It's a community filter, not bank-grade security — be a good neighbor. 🧡
          </p>
        </>
      )}

      {step === 1 && (
        <>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.ink, display: "block", marginBottom: 6 }}>
            Pick a display name
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. sam_f26 or your Reddit handle"
            value={name}
            maxLength={24}
            onChange={(e) => { setName(e.target.value); setNameErr(""); }}
          />
          {nameErr && <div style={{ color: "#B91C1C", fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>{nameErr}</div>}
          <label style={{ fontSize: 12, fontWeight: 700, color: C.ink, display: "block", margin: "18px 0 8px" }}>
            Where are you in the batch journey?
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStatus(s.id)}
                style={{
                  background: status === s.id ? s.bg : "#fff",
                  color: s.color,
                  border: `2px solid ${status === s.id ? s.color : C.line}`,
                  borderRadius: 999,
                  padding: "6px 13px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Btn disabled={!name.trim() || busy} onClick={join} style={{ width: "100%", padding: "12px" }}>
              {busy ? "Joining…" : "Join the hub →"}
            </Btn>
          </div>
          <p style={{ color: C.sub, fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
            Heads up: posts and replies are shared — every member can read them. Don't post anything private.
          </p>
        </>
      )}
    </div>
  );
}

// ---------- Stats bar ----------
function StatsBar({ members }) {
  const names = Object.keys(members);
  if (names.length === 0) return null;
  const counts = {};
  names.forEach((n) => {
    const s = members[n].status;
    counts[s] = (counts[s] || 0) + 1;
  });
  return (
    <div style={{ background: "#FFF7ED", borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", gap: 14, padding: "7px 14px", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.orangeDark, fontFamily: "ui-monospace, Menlo, monospace" }}>
          {names.length} {names.length === 1 ? "MEMBER" : "MEMBERS"}
        </span>
        {STATUSES.filter((s) => counts[s.id]).map((s) => (
          <span key={s.id} style={{ fontSize: 11, color: s.color, fontWeight: 700, fontFamily: "ui-monospace, Menlo, monospace" }}>
            {counts[s.id]} {s.label.replace(" 🎉", "").toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Composer ----------
function Composer({ channel, onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: C.sub, marginBottom: 10, fontFamily: "ui-monospace, Menlo, monospace" }}>
        New post in {channel.emoji} {channel.label}
      </div>
      <input style={{ ...inputStyle, marginBottom: 10, fontWeight: 700 }} placeholder="Title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
      <textarea
        style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.5 }}
        placeholder="Share details, ask for help, or tell your story…"
        value={body}
        maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <Btn kind="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn
          disabled={!title.trim() || busy}
          onClick={async () => {
            setBusy(true);
            await onSubmit(title.trim(), body.trim());
            setBusy(false);
          }}
        >
          {busy ? "Posting…" : "Post"}
        </Btn>
      </div>
    </div>
  );
}

// ---------- Post card ----------
function PostCard({ post, me, onUpvote, onReply, showChannel }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const upvoted = post.upvotes.includes(me.name);
  const ch = showChannel ? chanOf(post.channelId) : null;
  return (
    <div style={{ background: C.card, border: `1px solid ${post.pinned ? C.orange : C.line}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <button
          onClick={() => !post.pinned && onUpvote(post)}
          aria-label="Upvote"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            background: "transparent", border: "none", cursor: post.pinned ? "default" : "pointer", padding: "2px 4px",
            color: post.pinned ? C.orange : upvoted ? C.orange : C.sub, fontFamily: "inherit",
          }}
        >
          <span style={{ fontSize: 15, lineHeight: 1 }}>{post.pinned ? "📌" : "▲"}</span>
          {!post.pinned && <span style={{ fontSize: 12, fontWeight: 800 }}>{post.upvotes.length}</span>}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, lineHeight: 1.35 }}>{post.title}</div>
          {post.body && (
            <div style={{ fontSize: 13.5, color: "#3F3F37", lineHeight: 1.55, marginTop: 6, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {post.body}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{post.author}</span>
            <Chip status={post.status} small />
            {ch && (
              <span style={{ fontSize: 10.5, color: C.orangeDark, fontWeight: 700, fontFamily: "ui-monospace, Menlo, monospace" }}>
                {ch.emoji} {ch.label}
              </span>
            )}
            <span style={{ fontSize: 11, color: C.sub, fontFamily: "ui-monospace, Menlo, monospace" }}>{timeAgo(post.ts)}</span>
            <button
              onClick={() => setOpen(!open)}
              style={{ background: "none", border: "none", color: C.orangeDark, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            >
              {post.replies.length === 0 ? "Reply" : `${post.replies.length} ${post.replies.length === 1 ? "reply" : "replies"}`}
            </button>
          </div>
          {open && (
            <div style={{ marginTop: 12, borderLeft: `2px solid ${C.line}`, paddingLeft: 12 }}>
              {post.replies.map((r) => (
                <div key={r.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{r.author}</span>
                    <Chip status={r.status} small />
                    <span style={{ fontSize: 10.5, color: C.sub, fontFamily: "ui-monospace, Menlo, monospace" }}>{timeAgo(r.ts)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#3F3F37", lineHeight: 1.5, marginTop: 3, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{r.body}</div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
                  placeholder="Add a reply…"
                  value={reply}
                  maxLength={1000}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && reply.trim() && !busy) {
                      setBusy(true);
                      await onReply(post, reply.trim());
                      setReply("");
                      setBusy(false);
                    }
                  }}
                />
                <Btn
                  disabled={!reply.trim() || busy}
                  style={{ padding: "8px 14px" }}
                  onClick={async () => {
                    setBusy(true);
                    await onReply(post, reply.trim());
                    setReply("");
                    setBusy(false);
                  }}
                >
                  ↩
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Main app ----------
export default function App() {
  const [profile, setProfile] = useState(null);
  const [checked, setChecked] = useState(false);
  const [members, setMembers] = useState({});
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await loadProfile();
      setProfile(p);
      if (p) setMembers(await loadMembers());
      setChecked(true);
    })();
  }, []);

  const sortPosts = (data) =>
    data.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const la = Math.max(a.ts, ...a.replies.map((r) => r.ts), 0);
      const lb = Math.max(b.ts, ...b.replies.map((r) => r.ts), 0);
      return lb - la;
    });

  const refresh = useCallback(async (chanId) => {
    setLoading(true);
    let data = await loadChannel(chanId);
    // Seed the pinned intro thread in General on first visit
    if (chanId === "general" && !data.some((p) => p.id === INTRO_POST.id)) {
      data = [INTRO_POST, ...data];
      await saveChannel(chanId, data);
    }
    setPosts(sortPosts(data));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (profile && results === null) refresh(channel.id);
  }, [profile, channel, refresh, results]);

  const mutate = async (chanId, fn) => {
    const fresh = await loadChannel(chanId);
    await saveChannel(chanId, fn(fresh));
    if (results !== null) await runSearch(query);
    else await refresh(chanId);
  };

  const addPost = async (title, body) => {
    await mutate(channel.id, (list) => [
      { id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, title, body, author: profile.name, status: profile.status, ts: Date.now(), upvotes: [], replies: [] },
      ...list,
    ]);
    setComposing(false);
  };

  const upvote = async (post) => {
    await mutate(post.channelId || channel.id, (list) =>
      list.map((p) => {
        if (p.id !== post.id) return p;
        const has = p.upvotes.includes(profile.name);
        return { ...p, upvotes: has ? p.upvotes.filter((n) => n !== profile.name) : [...p.upvotes, profile.name] };
      })
    );
  };

  const addReply = async (post, body) => {
    await mutate(post.channelId || channel.id, (list) =>
      list.map((p) =>
        p.id === post.id
          ? { ...p, replies: [...p.replies, { id: `r_${Date.now()}`, author: profile.name, status: profile.status, body, ts: Date.now() }] }
          : p
      )
    );
  };

  const setStatus = async (statusId) => {
    const p = { ...profile, status: statusId };
    setProfile(p);
    await saveProfile(p);
    const m = await loadMembers();
    if (m[p.name]) {
      m[p.name].status = statusId;
      await saveMembers(m);
      setMembers(m);
    }
    setShowStatusPicker(false);
  };

  const runSearch = async (q) => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      setResults(null);
      return;
    }
    setSearching(true);
    const all = [];
    for (const ch of CHANNELS) {
      const data = await loadChannel(ch.id);
      data.forEach((p) => {
        const hay = `${p.title} ${p.body} ${p.author} ${p.replies.map((r) => r.body + " " + r.author).join(" ")}`.toLowerCase();
        if (hay.includes(needle)) all.push({ ...p, channelId: ch.id, pinned: false });
      });
    }
    setResults(sortPosts(all));
    setSearching(false);
  };

  if (!checked) return <div style={{ minHeight: "100vh", background: C.bg }} />;
  if (!profile)
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Avenir Next', 'Segoe UI', system-ui, sans-serif" }}>
        <Onboarding
          onDone={async (p) => {
            await saveProfile(p);
            setProfile(p);
            setMembers(await loadMembers());
          }}
        />
      </div>
    );

  const inSearch = results !== null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Avenir Next', 'Segoe UI', system-ui, sans-serif", color: C.ink }}>
      {/* Signature orange bar */}
      <header style={{ background: C.orange, padding: "10px 16px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
            <span style={{ background: "#fff", color: C.orange, fontWeight: 900, fontSize: 13, padding: "1px 6px", borderRadius: 4, fontFamily: "ui-monospace, Menlo, monospace" }}>
              {BATCH_LABEL}
            </span>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Founders Hub</span>
          </div>
          <button
            onClick={() => setShowStatusPicker(!showStatusPicker)}
            style={{ background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 999, padding: "4px 11px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}
          >
            {profile.name} · {statusOf(profile.status).label}
          </button>
        </div>
        {showStatusPicker && (
          <div style={{ maxWidth: 760, margin: "8px auto 0", display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {STATUSES.map((s) => (
              <button key={s.id} onClick={() => setStatus(s.id)} style={{ background: "#fff", color: s.color, border: "none", borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: profile.status === s.id ? 1 : 0.85 }}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Live batch stats */}
      <StatsBar members={members} />

      {/* Search */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "8px 12px", display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, padding: "8px 12px", fontSize: 13, borderRadius: 999 }}
            placeholder="🔍 Search all channels — posts, replies, people…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
          />
          {inSearch && (
            <Btn kind="ghost" style={{ borderRadius: 999, flexShrink: 0 }} onClick={() => { setQuery(""); setResults(null); }}>
              ✕
            </Btn>
          )}
        </div>
      </div>

      {/* Channel tabs (hidden during search) */}
      {!inSearch && (
        <nav style={{ background: C.card, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", gap: 2, padding: "0 8px" }}>
            {CHANNELS.map((ch) => (
              <button
                key={ch.id}
                onClick={() => { setChannel(ch); setComposing(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                  padding: "11px 10px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                  color: channel.id === ch.id ? C.ink : C.sub,
                  borderBottom: `3px solid ${channel.id === ch.id ? C.orange : "transparent"}`,
                }}
              >
                {ch.emoji} {ch.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Feed */}
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px 12px 60px" }}>
        {inSearch ? (
          searching ? (
            <div style={{ textAlign: "center", color: C.sub, padding: 40, fontSize: 13, fontFamily: "ui-monospace, Menlo, monospace" }}>searching…</div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: C.sub, marginBottom: 12, fontFamily: "ui-monospace, Menlo, monospace" }}>
                {results.length} {results.length === 1 ? "result" : "results"} for "{query.trim()}"
              </div>
              {results.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px", border: `2px dashed ${C.line}`, borderRadius: 14 }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>🔍</div>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>No matches</div>
                  <div style={{ color: C.sub, fontSize: 13 }}>Try a shorter keyword, or clear the search to browse channels.</div>
                </div>
              ) : (
                results.map((p) => <PostCard key={`${p.channelId}_${p.id}`} post={p} me={profile} onUpvote={upvote} onReply={addReply} showChannel />)
              )}
            </>
          )
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <p style={{ color: C.sub, fontSize: 12.5, lineHeight: 1.4, margin: 0 }}>{channel.blurb}</p>
              {!composing && <Btn onClick={() => setComposing(true)} style={{ flexShrink: 0 }}>+ Post</Btn>}
            </div>

            {composing && <Composer channel={channel} onSubmit={addPost} onCancel={() => setComposing(false)} />}

            {loading ? (
              <div style={{ textAlign: "center", color: C.sub, padding: 40, fontSize: 13, fontFamily: "ui-monospace, Menlo, monospace" }}>
                loading the board…
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", border: `2px dashed ${C.line}`, borderRadius: 14 }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>{channel.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Nothing here yet</div>
                <div style={{ color: C.sub, fontSize: 13, marginBottom: 16 }}>Be the first to start the conversation in {channel.label}.</div>
                <Btn onClick={() => setComposing(true)}>Write the first post</Btn>
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} me={profile} onUpvote={upvote} onReply={addReply} />)
            )}

            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button onClick={() => { refresh(channel.id); loadMembers().then(setMembers); }} style={{ background: "none", border: "none", color: C.sub, fontSize: 12, cursor: "pointer", fontFamily: "ui-monospace, Menlo, monospace" }}>
                ↻ refresh board
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
