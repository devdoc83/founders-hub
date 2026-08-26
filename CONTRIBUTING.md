# Contributing

Thanks for helping build the hub! 🧡

## Ground rules

- Be kind and constructive — most contributors here are first-time founders.
- Small, focused PRs beat giant ones.
- Open an issue before large changes so we can discuss direction.

## Dev setup

```bash
npm install
npm run dev
```

## Architecture in 30 seconds

- `src/App.jsx` — the whole UI (single component tree, inline styles, no CSS framework)
- `src/storage.js` — key-value storage adapter. **All persistence goes through this file.**
  Swap its internals for a real backend without touching the UI.

## Biggest ways to help right now

1. Backend implementation of `storage.js` (Supabase suggested)
2. Moderation / admin approval flow
3. Splitting `App.jsx` into components as it grows
