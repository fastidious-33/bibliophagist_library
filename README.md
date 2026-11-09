# Bibliophagist Library

Website for a small lending library: a searchable book catalog, a stats
ledger, and (coming) loan tracking — which books are on the shelf and which
are out on loan.

Started as a copy of The Saturday Book Community site (`tsbc_website`), with
its events, initiatives, team and merch sections removed. The visual design
is still TSBC's card-catalog theme, pending a redesign.

Live at <https://bibliophagist-library.vercel.app>

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Sanity CMS ·
Typesense · Chart.js · Vercel · Northflank

---

## How the pieces fit together

Three services, each doing one job:

| Service | Role | Hosted on |
| --- | --- | --- |
| **Next.js app** | The website itself | Vercel |
| **Sanity** | Source of truth for books; editing UI is the Studio in `studio/` | Sanity's cloud (free tier) |
| **Typesense** | Search index for the catalog | Northflank (free tier) |

Sanity holds the real data. Typesense holds a searchable *copy* of the books,
and exists only so `/catalog` can do fast full-text search and faceted
filtering. If Typesense and Sanity ever disagree, Sanity wins — Typesense can
always be rebuilt from scratch.

### Keeping Typesense in sync

There are **three** sync paths, deliberately. Understanding this is most of
understanding the project:

1. **Boot-time full rebuild** (`typesense/docker-entrypoint.sh`)
   The Typesense container has **no persistent disk**. Every time it boots it
   starts with an empty index and repopulates it from Sanity before serving
   traffic. This is what replaces paying for a volume: cold starts are slower,
   but nothing is ever permanently lost.

2. **Webhook, one document at a time** (`app/api/sanity-webhook/route.ts`)
   Sanity calls this route whenever a book is published or deleted. It
   re-fetches that single document and upserts or deletes it in Typesense.
   Signature-verified with `@sanity/webhook`.

3. **Manual full resync** (`npm run sync:typesense`)
   Disaster recovery, run from your laptop against the live Typesense host.
   See the caveat under "Known rough edges" before relying on it.

### The catalog

`/catalog` is the most involved page in the project.

- **All state lives in the URL** — query, filters, sort, page. Every view is
  shareable, bookmarkable, and survives a refresh, and the back button steps
  through it. `hooks/useCatalogUrl.ts` owns this.
- **Updates use the native History API**, not `router.push`. The App Router
  has no shallow-routing option, so `router.push`/`replace` trigger a server
  round trip that re-renders the page and queries Typesense — meaning every
  click cost two searches. Next patches `pushState`/`replaceState` so
  `useSearchParams` still sees the change.
- **Filter options are disjunctive.** Each filter's options reflect every
  *other* active filter but ignore its own — so selecting one theme never
  hides another (which would break multi-select), while selecting a year band
  does narrow the themes on offer. Options with no results disappear.
  `lib/typesense/search.ts` does this with one `multi_search` containing the
  results query plus one facet-only query per active filter.
- **Year bands are hardcoded** in `lib/typesense/catalog-facets.ts`. An
  earlier design derived them from the data, but boundaries computed from
  counts move as you filter, so options changed shape mid-click.
- **Search highlighting** uses Typesense's `matched_tokens` and wraps them in
  React, rather than rendering its pre-marked HTML snippets — so nothing from
  the dataset is ever injected as markup.

### Rendering and caching

- `/catalog` is **dynamic** — it reads `searchParams`, so it renders on every
  request. Its first paint is server-rendered from Typesense, then
  `CatalogBrowser` takes over client-side.
- Most other pages use ISR with `export const revalidate = 60`. Content edits
  appear within a minute or so without a redeploy. Note this is a floor, not a
  ceiling: the refresh happens on the *next* visit after 60s, so on a quiet day
  your own edits may take longer than a minute to show up.
- Book detail pages are prerendered at build time via
  `generateStaticParams`, and new ones render on demand.

---

## Routes

| Route | Notes |
| --- | --- |
| `/` | Landing page: hero, book count, three most recent books |
| `/catalog` | Searchable, filterable catalog (Typesense-backed) |
| `/catalog/[slug]` | Book detail |
| `/catalog/random` | Redirects to a random book. Always dynamic |
| `/ledger` | What the catalog is made of — themes, decades, languages, ratings |
| `/about` | Static content page |
| `/api/books/search` | JSON search proxy in front of Typesense |
| `/api/sanity-webhook` | Sanity → Typesense real-time sync |
| `/api/health` | Sanity reachability check, hit daily by Vercel Cron |

---

## Local setup

Requires **Node 20.9+**.

```bash
npm install
cp env.local.example .env.local   # then fill it in — see below
npm run dev
```

Without env vars the site still runs: `lib/sanity/queries.ts` falls back to a
small set of placeholder books so a fresh clone renders something. The
catalog's search will be empty, since that needs a real Typesense instance.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint 9 (flat config) |
| `npm run sync:typesense` | Full manual reindex from Sanity into Typesense |

`sync:typesense` uses Node's built-in `--env-file=.env.local` — there's no
`dotenv` dependency, deliberately.

---

## Environment variables

Two separate sets, because two separate services need them.

### The Next.js app (`.env.local`, and Vercel project settings)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project. Public, not a secret |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production` |
| `TYPESENSE_HOST` | Northflank service hostname (no protocol) |
| `TYPESENSE_PORT` | Usually `443` |
| `TYPESENSE_PROTOCOL` | Usually `https` |
| `TYPESENSE_API_KEY` | **Secret.** Never prefix with `NEXT_PUBLIC_` |
| `SANITY_WEBHOOK_SECRET` | **Secret.** Must match the secret set on the Sanity webhook |

### The Typesense container (Northflank service settings)

| Variable | Purpose |
| --- | --- |
| `TYPESENSE_API_KEY` | Same value as above — this is what creates it |
| `SANITY_PROJECT_ID` | Falls back to `NEXT_PUBLIC_SANITY_PROJECT_ID` if unset |
| `SANITY_DATASET` | Defaults to `production` |

`TYPESENSE_DATA_DIR` and `TYPESENSE_INTERNAL_PORT` are baked into the
Dockerfile and shouldn't need overriding.

---

## Deployment

### 1. Sanity

The Sanity Studio (the admin UI for books) lives in `studio/`, a separate
package with its own `package.json`. It's excluded from the Next app's
tsconfig and ESLint, and Vercel never builds it. **`studio/schemaTypes/` is
the only copy of the schemas.**

```bash
cd studio
npm install
npm run dev       # local Studio at http://localhost:3333
npx sanity deploy # publishes to https://bibliophagist-library.sanity.studio
```

The `production` dataset must be **public**: the Typesense sync reads it via
the GROQ HTTP API without a token.

### 2. Typesense on Northflank

Build from `typesense/Dockerfile`, with the **repo root** as build context
(the image needs `scripts/typesense/`). Set the three container env vars
above, expose port `8108`, and give the service a public HTTPS endpoint —
that hostname becomes `TYPESENSE_HOST` for the Next app.

### 3. Next.js on Vercel

Import the repo, add all seven env vars from the first table, deploy. Pushes
to the working branch redeploy automatically.

### 4. The Sanity webhook

In [manage.sanity.io](https://manage.sanity.io) → API → Webhooks:

- **URL:** `https://bibliophagist-library.vercel.app/api/sanity-webhook`
- **Trigger on:** create, update, delete
- **Filter:** `_type == "book"`
- **Secret:** same value as `SANITY_WEBHOOK_SECRET` on Vercel

Without the matching secret every call is rejected with a 401 and search will
silently stop updating in real time.

---

## Project conventions

Things that look wrong but are deliberate:

- **`hooks/useUrlPage.ts`** — pagination state lives in the URL, not
  `useState`. `setPage` must keep a **stable identity**: components list it in
  effect dependency arrays, and a changing identity re-runs those effects on
  every navigation. The current URL is held in a ref for that reason.
- **`app/layout.tsx`** — `<html>` needs both `suppressHydrationWarning` (a
  blocking script sets `data-theme` before React hydrates) and
  `data-scroll-behavior="smooth"`.
- **`components/ThemeToggle.tsx`** — uses `useEffect` rather than a lazy
  `useState` initializer, with an `eslint-disable`. The not-found and error
  pages don't run the blocking theme script, so the theme needs correcting
  client-side after mount.
- **`hooks/useThemeColors.ts`** — Chart.js draws to canvas and can't read CSS
  variables, so `/ledger` resolves them in JS and watches `data-theme` with a
  MutationObserver to restyle on theme change.
- **Error boundaries are segment-scoped.** `app/catalog/error.tsx` exists so
  a Typesense or Sanity
  hiccup degrades to a targeted "try again" card, and returns a 5xx rather
  than a 404 — search engines read 404 as permanently gone.
- **Component colocation** — a component used by exactly one route lives next
  to that route's `page.tsx` (e.g. `app/catalog/CatalogBrowser.tsx`), not in
  `components/`.
- **Image domains** — covers come from `cdn.sanity.io` and
  `covers.openlibrary.org`, both whitelisted in `next.config.js`
  `remotePatterns`. New domains must be added there.
- **Design system** — all of it is in `app/globals.css`. There's no CSS
  framework.

## Working on this

- **Test navigation and caching with `npm run build && npm run start`**, not
  `npm run dev`. Dev mode behaves differently for caching, back-button
  behaviour, and error boundaries.
- This is **Next.js 16** specifically. Caching, image config, ESLint, and
  routing have all changed across recent majors — check current docs rather
  than assuming older patterns.
- After dependency changes, confirm what's actually installed:
  `npm ls next react react-dom eslint-config-next`.
- If Turbopack complains about a missing module factory in dev, it's stale
  build cache — delete `.next` and restart. Common right after `npm install`.

---

## Known rough edges

Honest list, so future-you doesn't rediscover these from scratch.

- **`runFullSync` doesn't truncate.** `scripts/typesense/sync-core.mjs` creates
  the collection only if missing, then upserts. So `npm run sync:typesense`
  will not remove books deleted from Sanity, and edits to `schema.mjs` never
  apply to an existing collection. The boot-time path gets away with this
  because it always starts empty. **This also blocks a "recently added" sort
  option on the catalog**, which would need a new indexed field.
- **The webhook doesn't revalidate Next's cache.** Search updates instantly;
  the book's own page can lag by a minute or more.
- **The sitemap omits book pages.** `app/sitemap.ts` covers only the static
  routes, not `/catalog/[slug]`.
- **Leftover TSBC styles.** `app/globals.css` still has rules for the removed
  events, merch, team and initiative pages. They go with the redesign.
