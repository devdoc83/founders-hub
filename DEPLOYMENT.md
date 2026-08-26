# Deployment

## 1. Vercel (the website)

1. Go to https://vercel.com → sign in with GitHub → **Add New… → Project**
2. Import `devdoc83/founders-hub` → framework auto-detects as Vite → **Deploy**
3. Project → **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `VITE_INVITE_CODE` | your secret code |
| `VITE_BATCH_LABEL` | `F26` |
| `VITE_BATCH_NAME` | `YC Fall 2026` |
| `VITE_SUPABASE_URL` | from Supabase (step 2) |
| `VITE_SUPABASE_ANON_KEY` | from Supabase (step 2) |

4. **Deployments → ⋯ → Redeploy** after adding/changing env vars.

Without the Supabase vars the site runs in **demo mode** (each visitor sees only
their own posts — check the browser console for the warning).

## 2. Supabase (the shared database)

1. https://supabase.com → New project (free tier) → pick a name + password → wait ~1 min
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**
3. **Project Settings → API** → copy **Project URL** and **anon public** key
4. Put them in Vercel env vars (above) and in a local `.env` for dev:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

5. Redeploy on Vercel. Open the site in two different browsers — posts should
   now appear in both. 🎉

## Notes

- The anon key is safe to expose in the frontend by design; access is governed
  by the row-level-security policies in `schema.sql`. Right now the board is
  intentionally open (anyone with the app can write) — real auth + moderation
  are the top roadmap items.
- New batch? Change `VITE_BATCH_LABEL` / `VITE_BATCH_NAME` and redeploy — fresh
  board, old batch data preserved.
