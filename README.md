# 🧡 F26 Founders Hub

An always-on community board for **YC Fall 2026 applicants** — born from the
r/ycombinator application megathread. Applied, interviewing, accepted, rejected,
or building anyway: everyone keeps helping each other here, long after decision day.

## Features

- 🔑 Invite-code gate (share the code only in the community thread)
- 🏷️ Batch-status chips: Applied · Interviewing · Accepted · Not this batch · Building anyway
- 📊 Live member stats bar
- 📋 Six channels: Applications, Interviews, Results, Co-founder search, Build & help, General
- 📌 Pinned intro thread, posts, threaded replies, upvotes
- 🔍 Search across all channels (posts, replies, authors)

## Quickstart

```bash
npm install
npm run dev
```

Set your own invite code in a `.env` file (never commit real codes to a public repo):

```
VITE_INVITE_CODE=YOUR-SECRET-CODE
```

## ⚠️ Demo mode — read this first

Storage currently uses `localStorage` (see `src/storage.js`), so data lives
**only in your own browser**. It's perfect for local dev and UI work, but it is
not multi-user yet. Making it real is the #1 roadmap item — see below.

## Roadmap (help wanted!)

- [ ] **Real backend** — implement `src/storage.js` on Supabase/Firebase/etc. (keeps the same 4-method interface)
- [ ] Real auth (magic links) instead of honor-system display names
- [ ] Moderation tools: report, delete, admin approval queue for new members
- [ ] Realtime updates instead of manual refresh
- [ ] Notifications for replies
- [ ] Direct messages for co-founder matching
- [ ] Deploy story (Vercel/Netlify one-click)

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Be kind; this is a
founder support community first and a codebase second.

## License

MIT — see [LICENSE](LICENSE).
