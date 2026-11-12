# Bibliophagist Library

Website for a small lending library: a searchable book catalog, a stats
ledger, and (coming) loan tracking — which books are on the shelf and which
are out on loan.

Started as a copy of The Saturday Book Community site (`tsbc_website`), with
its events, initiatives, team and merch sections removed. The visual design
is still TSBC's card-catalog theme, pending a redesign.

Live at <https://bibliophagist-library.vercel.app>

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Sanity CMS ·
Chart.js · Vercel · (later) Typesense on Northflank

---

## How the pieces fit together

| Service | Role | Hosted on |
| --- | --- | --- |
| **Next.js app** | The website itself | Vercel |
| **Sanity** | Source of truth for books. The Studio (editing UI) is its own repo, `library_dataset/`, next to this one | Sanity's cloud (free tier) |
| **Typesense** | *Optional, not deployed yet.* Search index for the catalog | Northflank (free tier) |

### Search: Sanity now, Typesense later

All catalog search goes through one function, `searchBooks` in
`lib/search/index.ts`, which picks a backend by env vars:

- **Sanity (the default)** — `lib/search/sanity.ts` loads a light projection
  of every book once, keeps it in Next's Data Cache under the `books` tag, and
  does the text match, filters, facet counts, sorting and paging in memory.
  Comfortable up to a couple of thousand books. The Sanity webhook drops the
  cached copy on every publish/delete; an hourly revalidate is the safety net.
- **Typesense** — `lib/typesense/search.ts`, used automatically once
  `TYPESENSE_HOST` and `TYPESENSE_API_KEY` are both set. Same response shape,
  so nothing else changes.

Either way Sanity holds the real data; Typesense would only hold a searchable
*copy*. If they ever disagree, Sanity wins — Typesense can always be rebuilt
from scratch.

### Keeping Typesense in sync (once it's deployed)

There are **three** sync paths, deliberately. Understanding this is most of
understanding the project:

1. **Boot-time full rebuild** (`typesense/docker-entrypoint.sh`)
   The Typesense container has **no persistent disk**. Every time it boots it
   starts with an empty index and repopulates it from Sanity before serving
   traffic. This is what replaces paying for a volume: cold starts are slower,
   but nothing is ever permanently lost.

2. **Webhook, one document at a time** (`app/api/sanity-webhook/route.ts`)
   Sanity calls this route whenever a book is published or deleted. It always
   revalidates the `books` cache tag (the Sanity search index), and when
   Typesense is configured it also re-fetches that single document and
   upserts or deletes it there. Signature-verified with `@sanity/webhook`.

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
  round trip that re-renders the page and runs the search — meaning every
  click cost two searches. Next patches `pushState`/`replaceState` so
  `useSearchParams` still sees the change.
- **Filters are tags and year bands.** Tags double as collections/genres
  (Fiction, Non-Fiction, Indian Authors, …). Several selected tags are OR'd;
  tags and bands are AND'd.
- **Filter options are disjunctive.** Each filter's options reflect every
  *other* active filter but ignore its own — so selecting one tag never
  hides another (which would break multi-select), while selecting a year band
  does narrow the tags on offer. Options with no results disappear. The
  Sanity backend computes this in memory; the Typesense one with a single
  `multi_search` (results query plus one facet-only query per active filter).
- **Year bands are hardcoded** in `lib/search/catalog-facets.ts`. An
  earlier design derived them from the data, but boundaries computed from
  counts move as you filter, so options changed shape mid-click.
- **Search highlighting** comes back as a list of matched tokens per field,
  wrapped in React — never pre-marked HTML — so nothing from the dataset is
  ever injected as markup.
- **Client components import only `lib/search/types.ts` and
  `lib/search/catalog-facets.ts`.** `lib/search/index.ts` pulls in the server
  backends.

### Rendering and caching

- `/catalog` is **dynamic** — it reads `searchParams`, so it renders on every
  request. Its first paint is server-rendered from the search, then
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
| `/` | The vision: painting, intro with the live book count, the two doors ("Which way in?": a secret bookcase to the catalog, a castle door to the librarian), the librarian's desk shelf, the quotes clock |
| `/browse` | Every way into the library: how to borrow, search, genres, Librarian's Picks, the ledger |
| `/catalog` | Searchable, filterable catalog, with a genre shelf that filters in place |
| `/catalog/[slug]` | Book detail |
| `/catalog/genres` | All genres (tags), grouped Fiction / Non-Fiction / Both |
| `/catalog/genres/[slug]` | One genre: its books, picks and related genres. ISR, static params from the tags |
| `/catalog/random` | Redirects to a random book. Always dynamic |
| `/borrow` | How to borrow, the rules, the rights of the reader |
| `/ledger` | What the catalog is made of — tags, authors, decades, ratings |
| `/librarian` | The librarian: portrait, bio, and the rooms below |
| `/librarian/writings`, `/featured`, `/saved`, `/body-art`, `/music` | The rooms. Content hardcoded in `lib/librarian.ts` until M2 |
| `/about` | Permanent redirect to `/librarian` (`next.config.js`) |
| `/api/books/search` | JSON catalog search (Sanity or Typesense, see above) |
| `/api/sanity-webhook` | Refreshes the search index on publish/delete (+ Typesense sync when configured) |
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
small set of placeholder books so a fresh clone renders something, and the
catalog searches those. Leave `TYPESENSE_HOST` empty to use Sanity search.

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
| `SANITY_WEBHOOK_SECRET` | **Secret.** Must match the secret set on the Sanity webhook |
| `TYPESENSE_HOST` | *Optional.* Northflank service hostname (no protocol). Empty = Sanity search |
| `TYPESENSE_PORT` | *Optional.* Usually `443` |
| `TYPESENSE_PROTOCOL` | *Optional.* Usually `https` |
| `TYPESENSE_API_KEY` | *Optional.* **Secret.** Never prefix with `NEXT_PUBLIC_` |

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

The Sanity Studio (the admin UI for books) is its own repo,
`library_dataset/`, a sibling of this one. Vercel never builds it.
**`library_dataset/schemaTypes/` is the only copy of the schemas** — if a
book field changes there, update the GROQ projections in `lib/sanity/`,
`lib/search/sanity.ts`, the webhook and `scripts/typesense/` to match.

```bash
cd ../library_dataset
npm install
npm run dev       # local Studio at http://localhost:3333
npx sanity deploy # publishes to https://bibliophagist-library.sanity.studio
```

Books can also be bulk-imported as ndjson with
`npx sanity dataset import <file>.ndjson production` (ids `B001`, `B002`, …,
with `bookId` — the call number on cards — set to the same value).

The `production` dataset must be **public**: the Typesense sync reads it via
the GROQ HTTP API without a token.

### 2. Typesense on Northflank (later — optional)

Build from `typesense/Dockerfile`, with the **repo root** as build context
(the image needs `scripts/typesense/`). Set the three container env vars
above, expose port `8108`, and give the service a public HTTPS endpoint —
that hostname becomes `TYPESENSE_HOST` for the Next app.

### 3. Next.js on Vercel

Import the repo, add the env vars from the first table (the Typesense ones
only once Typesense is running), deploy. Pushes to the working branch
redeploy automatically.

### 4. The Sanity webhook

In [manage.sanity.io](https://manage.sanity.io) → API → Webhooks:

- **URL:** `https://bibliophagist-library.vercel.app/api/sanity-webhook`
- **Trigger on:** create, update, delete
- **Filter:** `_type == "book"`
- **Secret:** same value as `SANITY_WEBHOOK_SECRET` on Vercel

Without the matching secret every call is rejected with a 401, and new or
edited books only reach catalog search on the hourly revalidate.

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
- **`hooks/useDoorOpening.ts`** — the home page doors' resting state
  (`data-rest`, `data-ajar-leaf`) is set on the DOM after mount, not held in
  React state. The server always renders the doors shut, so there's no
  hydration mismatch, and an ajar door eases open by itself. A click is held
  (2.7s bookcase, 2.3s castle) before `router.push`, so the visitor sees
  the room first; modified clicks and reduced motion go straight through.
- **A third "pull a random book" icon on `/catalog`** — the header already
  has two (either side of the nav), and the catalog page puts another by
  its title. That's on purpose: it's where browsing happens. Don't remove
  it as a duplicate.
- **Unused images live outside the site** — spare paintings and textures
  are kept in `bibliophagist_library/prototypes/assets/`, not `public/`, so
  they aren't deployed.
- **Home page textures** — `public/textures/` holds CC0 photo textures
  (Poly Haven walnut, castle stone and medieval oak; a CC0 shelf photo from
  Wikimedia Commons, graded and composed into `bookshelf-wall.jpg`, with the
  lever book cut from it). The bookcase's lever and shelf-front positions in
  `globals.css` are measured from that image; re-cropping it means
  re-measuring them.
- **Prototypes** — earlier door designs are archived outside the repo, in
  `bibliophagist_library/prototypes/home-doors/`, with restore steps.

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
- **The webhook only refreshes search.** The catalog's search index updates
  right away; the book's own page and the home page are ISR and can lag by a
  minute or more.
- **Substring search.** The Sanity backend matches substrings, so "fiction"
  also finds books tagged "Non-Fiction". Typesense would rank these better.
