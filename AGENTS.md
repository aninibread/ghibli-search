# AGENTS.md

## Cursor Cloud specific instructions

### Product
Single Cloudflare Workers + React Router 7 app (**Studio Ghibli Search**). There is no local DB, Docker Compose, or secondary process — only `npm run dev` (port **5173**).

### Commands
Standard scripts are in `package.json` / README (`dev`, `build`, `typecheck`, `deploy`). Package manager is **npm** (`package-lock.json`).

### Bindings / Cloudflare auth
- Search uses the **AI Search instance binding** `GHIBLI_SEARCH` → instance `studio-ghibli-google` (R2 source `studio-ghibli-stills`; not legacy `env.AI.autorag()`).
- Workers AI binding `AI` is still required for `/api/analyze-image` (`toMarkdown`) and `/api/rewrite-query` (`AI.run`).
- R2 buckets and `GHIBLI_SEARCH` are configured with `"remote": true`, so `npm run dev` needs `npx wrangler login` (or equivalent CF credentials). Without auth, the Vite Cloudflare plugin fails to start a remote proxy session.
- Homepage `/api/random` falls back to bundled `public/placeholders/` when R2 is unavailable; search/AI routes need real Cloudflare resources.

### Known pre-existing typecheck issue
`npm run typecheck` reports `app/components/floating-images.tsx` (`useRef<number>()` needs an initial arg under React 19 types). Production `npm run build` still succeeds.
