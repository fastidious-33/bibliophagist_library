'use client';

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import BookCard from '@/components/BookCard';
import PageIndex from '@/components/PageIndex';
import type { SearchBook } from '@/lib/search/types';
import {
  WING_LABEL,
  authorDrill,
  booksInDecade,
  booksInLength,
  bubbles,
  commentary,
  crowd,
  crowdAverage,
  decades,
  figures,
  genreMix,
  longestBooks,
  mostlyGenre,
  seriesDrill,
  spanLabel,
  filterBooks,
  lengths,
  liveLines,
  oldestAndNewest,
  overlay,
  selectionLabel,
  slimmest,
  storyGenres,
  topAuthors,
  topSeries,
  wheel,
  type BookLine,
  type Ranked,
  type Selection,
  type Wing,
} from '@/lib/story';
import {
  Breadcrumb,
  BubbleChart,
  CareerArc,
  GenreMix,
  Hint,
  LongestBars,
  MiniLedger,
  OverlayColumns,
  RankedBars,
  SeriesArc,
  WheelChart,
  type LedgerColumn,
} from './StoryCharts';

/* ---------- The selection: one wing or one genre, kept in the URL ---------- */

// Next patches pushState but fires no event for it, so the setter below
// tells the subscribers itself; popstate covers the back button.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}

const readSearch = () => window.location.search;
// The server has no URL to read: it draws the whole shelf, and the browser
// filters once it has hydrated.
const serverSearch = () => '';

function parseSelection(search: string): Selection {
  const sp = new URLSearchParams(search);
  const genre = sp.get('genre');
  if (genre) return { kind: 'genre', genre };
  const wing = sp.get('wing');
  if (wing === 'fiction' || wing === 'non-fiction') return { kind: 'wing', wing };
  return null;
}

/**
 * The story's selection, read from `?genre=` or `?wing=` (a genre wins if
 * both are there). `select(null)` clears it. Each change is a history entry,
 * so the back button steps through selections, as on the catalog.
 */
function useSelection(): [Selection, (next: Selection) => void] {
  const search = useSyncExternalStore(subscribe, readSearch, serverSearch);
  const select = useCallback((next: Selection) => {
    const sp = new URLSearchParams(window.location.search);
    sp.delete('genre');
    sp.delete('wing');
    if (next?.kind === 'genre') sp.set('genre', next.genre);
    if (next?.kind === 'wing') sp.set('wing', next.wing);
    const qs = sp.toString();
    window.history.pushState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    listeners.forEach((l) => l());
  }, []);
  return [parseSelection(search), select];
}

/* ---------- Pieces ---------- */

const number = (n: number) => n.toLocaleString('en-GB');
const plural = (n: number, word: string, many = `${word}s`) => `${number(n)} ${n === 1 ? word : many}`;

/** Linked titles, each with its author and a figure (a rating, or pages). */
function BookList({ books, unit }: { books: BookLine[]; unit: 'rating' | 'pages' }) {
  return (
    <ol className="ledger-list">
      {books.map((b) => (
        <li key={b.slug}>
          <Link href={`/catalog/${b.slug}`}>{b.title}</Link>
          <span className="ledger-list-meta">
            {b.author && `${b.author} · `}
            {unit === 'pages' ? `${number(b.value)} pages` : b.value.toFixed(2)}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The sentence that follows the selection, under a chapter's commentary.
 * Only shown with a selection: for the whole shelf the commentary already
 * says it. Not a live region: five of them changing at once would be read
 * out five times. The single announcement is in Story, below.
 */
function LiveLine({ text }: { text?: string }) {
  return text ? <p className="story-live">{text}</p> : null;
}

const WING_VALUE = (wing: Wing) => `wing:${wing}`;

/** The chapters, for "On this page". */
const CHAPTERS = [
  { id: 'story-shelves', label: 'What’s on the shelves' },
  { id: 'story-made-of', label: 'What it’s made of' },
  { id: 'story-compare', label: 'How the genres compare' },
  { id: 'story-who', label: 'Who wrote them' },
  { id: 'story-when', label: 'When they were written' },
  { id: 'story-length', label: 'How long they run' },
];

/**
 * Sticks to the top once the wheel has scrolled by: what's selected, a way
 * to clear it, and every genre (including ones too small to draw).
 */
function FilterBar({
  selection,
  genres,
  onChoose,
}: {
  selection: Selection;
  genres: { tag: string; count: number }[];
  onChoose: (next: Selection) => void;
}) {
  const value = !selection ? '' : selection.kind === 'wing' ? WING_VALUE(selection.wing) : selection.genre;
  const alphabetical = [...genres].sort((a, b) => a.tag.localeCompare(b.tag));
  // A ?genre= link to a tag that isn't a genre still gets an option, so the
  // dropdown never shows something other than what's selected.
  const unknown =
    selection?.kind === 'genre' && !genres.some((g) => g.tag === selection.genre) ? selection.genre : null;

  return (
    // On phones (CSS) this becomes one row: the genre dropdown (which shows
    // what's selected), then × to clear. The "Showing" line and the "Pick
    // a genre" label are then hidden from sight only.
    <div className="story-bar" role="region" aria-label="Story filter">
      <p className="story-chip">
        <span className="story-chip-text">
          Showing: <strong>{selection ? selectionLabel(selection) : 'the whole shelf'}</strong>
        </span>
        {selection && (
          <button type="button" aria-label={`Clear ${selectionLabel(selection)}`} onClick={() => onChoose(null)}>
            &times;
          </button>
        )}
      </p>
      <label className="story-pick story-genre-pick">
        <span className="story-pick-label">Pick a genre</span>
        <select
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) onChoose(null);
            else if (v === WING_VALUE('fiction')) onChoose({ kind: 'wing', wing: 'fiction' });
            else if (v === WING_VALUE('non-fiction')) onChoose({ kind: 'wing', wing: 'non-fiction' });
            else onChoose({ kind: 'genre', genre: v });
          }}
        >
          <option value="">The whole shelf</option>
          <optgroup label="Wings">
            <option value={WING_VALUE('fiction')}>{WING_LABEL.fiction}</option>
            <option value={WING_VALUE('non-fiction')}>{WING_LABEL['non-fiction']}</option>
          </optgroup>
          <optgroup label="Genres">
            {unknown && <option value={unknown}>{unknown} (0)</option>}
            {alphabetical.map((g) => (
              <option key={g.tag} value={g.tag}>
                {g.tag} ({g.count})
              </option>
            ))}
          </optgroup>
        </select>
      </label>
    </div>
  );
}

/* ---------- The story ---------- */

/** Which drill-downs are open, and the selection they were opened under. */
type Picks = { key: string; author: string | null; series: string | null; decade: string | null; band: string | null };
const NO_PICKS: Picks = { key: '', author: null, series: null, decade: null, band: null };

/* ---------- Drill-downs: each replaces its chart, in place ---------- */

/**
 * The frame every drill-down shares: the breadcrumb back to the chart it
 * replaced, the content, and (optionally) the way on to the catalog. It
 * never filters the story or touches the URL.
 */
function Drilled({
  back,
  title,
  onBack,
  catalogHref,
  children,
}: {
  back: string;
  title: string;
  onBack: () => void;
  catalogHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="story-panel" role="region" aria-label={title}>
      <Breadcrumb back={back} title={title} onBack={onBack} />
      {children}
      {catalogHref && (
        <Link href={catalogHref} className="read-link">
          See them in the catalog &rarr;
        </Link>
      )}
    </div>
  );
}

/** "4.05", with how it compares to the baseline ("+0.03 vs the shelf"). */
function crowdColumn(head: string, average: number | undefined, baseline: number | undefined, against: string): LedgerColumn {
  if (average === undefined) return { head, value: '–', note: 'no Goodreads averages' };
  const delta = baseline === undefined ? undefined : average - baseline;
  const sign = delta === undefined ? '' : delta >= 0.005 ? '+' : delta <= -0.005 ? '−' : '±';
  return {
    head,
    value: average.toFixed(2),
    note: delta === undefined ? undefined : `${sign}${Math.abs(delta).toFixed(2)} vs ${against}`,
  };
}

/** An author: their ledger line, then their career as a chart. */
function AuthorDrill({
  row,
  books,
  baseline,
  against,
  onBack,
}: {
  row: Ranked;
  books: SearchBook[];
  baseline?: number;
  against: string;
  onBack: () => void;
}) {
  const d = authorDrill(books, row.label);
  return (
    <Drilled back="All authors" title={row.label} onBack={onBack} catalogHref={row.href}>
      <MiniLedger
        columns={[
          { head: 'Books here', value: number(d.books) },
          { head: 'Writing', value: spanLabel(d.first, d.last) ?? '–' },
          {
            head: 'A typical one',
            value: d.medianPages !== undefined ? number(d.medianPages) : '–',
            unit: d.medianPages !== undefined ? 'pages' : undefined,
          },
          crowdColumn('The crowd', d.average, baseline, against),
        ]}
      />
      {d.career.length > 0 ? (
        <>
          <p className="story-panel-label">Their books over the years</p>
          <CareerArc
            author={row.label}
            points={d.career}
            reference={referenceFor(baseline, against)}
            footnote={
              <p className="ledger-footnote">
                Each dot is a book, placed by the year it first came out and its Goodreads average; the dashed line
                is {against}&rsquo;s average, and the scale doesn&rsquo;t start at zero.
                {d.unplaced > 0 &&
                  ` ${plural(d.unplaced, 'book')} without a year or a rating ${d.unplaced === 1 ? 'isn’t' : 'aren’t'} shown.`}
              </p>
            }
          />
        </>
      ) : (
        <p className="ledger-note">None of their books here has both a year and a Goodreads average yet.</p>
      )}
    </Drilled>
  );
}

/** The dashed comparison line on an arc: "Crime Fiction 3.92", or "The shelf 4.01". */
function referenceFor(baseline: number | undefined, against: string) {
  if (baseline === undefined) return undefined;
  const name = against === 'the shelf' ? 'The shelf' : against;
  return { value: baseline, label: `${name} ${baseline.toFixed(2)}` };
}

/** A series: its ledger line, then whether it holds up, book by book. */
function SeriesDrill({
  row,
  books,
  baseline,
  against,
  onBack,
}: {
  row: Ranked;
  books: SearchBook[];
  baseline?: number;
  against: string;
  onBack: () => void;
}) {
  const d = seriesDrill(books, row.label);
  const ratedCount = d.arc.filter((i) => i.rating !== undefined).length;
  return (
    <Drilled back="All series" title={row.label} onBack={onBack} catalogHref={row.href}>
      <MiniLedger
        columns={[
          { head: 'On the shelf', value: number(d.books), unit: d.books === 1 ? 'book' : 'books' },
          { head: 'Spans', value: spanLabel(d.first, d.last) ?? '–' },
          {
            head: 'End to end',
            value: d.totalPages ? number(d.totalPages) : '–',
            unit: d.totalPages ? 'pages' : undefined,
            note: d.noPages && d.totalPages ? `${plural(d.noPages, 'book')} without a count` : undefined,
          },
          d.favourite
            ? { head: 'Crowd’s favourite', value: d.favourite.rating!.toFixed(2), note: d.favourite.title }
            : { head: 'Crowd’s favourite', value: '–' },
        ]}
      />
      {ratedCount >= 3 ? (
        <>
          <p className="story-panel-label">Does it hold up?</p>
          <SeriesArc
            series={row.label}
            arc={d.arc}
            reference={referenceFor(baseline, against)}
            footnote={
              <p className="ledger-footnote">
                Book 1, 2, 3… in the order they were first published; the dashed line is {against}&rsquo;s average,
                and the scale doesn&rsquo;t start at zero.
              </p>
            }
          />
        </>
      ) : (
        <p className="ledger-note">The arc needs three rated books in the series; this one has {ratedCount}.</p>
      )}
    </Drilled>
  );
}

/**
 * A decade: its ledger line, then either what it leans towards (its genre
 * mix against everything shown) or, inside a selected genre, where a genre
 * mix would only compare co-tags, who wrote that decade's books.
 */
function DecadeDrill({
  decade,
  here,
  overall,
  leaveOut,
  baseline,
  against,
  onBack,
}: {
  decade: string;
  here: SearchBook[];
  overall: SearchBook[];
  leaveOut?: string;
  baseline?: number;
  against: string;
  onBack: () => void;
}) {
  const typical = figures(here).medianPages;
  const before = decade === 'Before 1900';
  const name = before ? 'Before 1900' : `The ${decade}`;
  const mix = leaveOut ? [] : genreMix(here, overall);
  const writers = leaveOut ? topAuthors(here, 10).rows : [];
  return (
    <Drilled back="All decades" title={name} onBack={onBack}>
      <MiniLedger
        columns={[
          { head: before ? 'Before 1900' : `From the ${decade}`, value: number(here.length), unit: here.length === 1 ? 'book' : 'books' },
          {
            head: 'A typical one',
            value: typical !== undefined ? number(typical) : '–',
            unit: typical !== undefined ? 'pages' : undefined,
          },
          crowdColumn('The crowd', crowdAverage(here), baseline, against),
          { head: 'Mostly', value: mostlyGenre(here, leaveOut) ?? '–' },
        ]}
      />
      {leaveOut ? (
        writers.length > 0 ? (
          <>
            <p className="story-panel-label">
              Who wrote {before ? 'its' : `the ${decade}’`} {leaveOut}
            </p>
            <RankedBars
              rows={writers}
              caption={`Who wrote ${name}'s ${leaveOut}`}
              column="Author"
              summary={`The authors of ${name}'s ${leaveOut}, led by ${writers[0].label} with ${writers[0].count}.`}
              footnote={<p className="ledger-footnote">Top {writers.length} by books from {before ? 'before 1900' : `the ${decade}`}.</p>}
            />
          </>
        ) : (
          <p className="ledger-note">No author is on file for these books.</p>
        )
      ) : mix.length > 0 ? (
        <>
          <p className="story-panel-label">What it leans towards</p>
          <GenreMix
            rows={mix}
            here={name}
            overall={against === 'the shelf' ? 'The whole shelf' : `All of ${against}`}
            footnote={
              <p className="ledger-footnote">
                Its top genres by books. Where the front bar reaches past the faded one, the{' '}
                {before ? 'era' : 'decade'} has more of that genre than usual.
              </p>
            }
          />
        </>
      ) : (
        <p className="ledger-note">None of these books has a genre tag yet.</p>
      )}
    </Drilled>
  );
}

/** A length bar zoomed in: its ledger line, then its ten longest books as bars. */
function LengthDrill({
  band,
  here,
  leaveOut,
  baseline,
  against,
  onBack,
}: {
  band: string;
  here: SearchBook[];
  leaveOut?: string;
  baseline?: number;
  against: string;
  onBack: () => void;
}) {
  const title = band === '1000+' ? '1,000 pages and more' : `${band} pages`;
  const top = longestBooks(here, 10);
  return (
    <Drilled back="All lengths" title={title} onBack={onBack}>
      <MiniLedger
        columns={[
          { head: 'Books', value: number(here.length) },
          crowdColumn('The crowd', crowdAverage(here), baseline, against),
          { head: 'Mostly', value: mostlyGenre(here, leaveOut) ?? '–' },
        ]}
      />
      <p className="story-panel-label">{top.length === here.length ? 'Longest first' : `The ${top.length} longest`}</p>
      <LongestBars books={top} band={title} />
    </Drilled>
  );
}

/** A book card under a small label ("The oldest · 1605"). */
function LabelledCard({ label, detail, book }: { label: string; detail: string; book: SearchBook }) {
  return (
    <div className="story-card">
      <p className="eyebrow-label">
        {label} <span className="ledger-extreme-detail">· {detail}</span>
      </p>
      <BookCard
        slug={book.slug}
        title={book.title}
        author={book.author}
        coverUrl={book.coverUrl}
        bookId={book.bookId}
        tags={book.tags}
      />
    </div>
  );
}

/**
 * The chapters (PLAN.md, "The Story of the Shelves"). The server draws them
 * for the whole shelf; in the browser they follow the selection, except the
 * two selectors (the wheel and the bubbles), which highlight it instead.
 */
export default function Story({ books, tallied }: { books: SearchBook[]; tallied: string }) {
  const [selection, select] = useSelection();
  // The wing the wheel was opened into. It stays open while a genre from
  // that wing is selected, and closes with the selection.
  const [openWing, setOpenWing] = useState<Wing | null>(null);
  // The open drill-downs: chapter 5's author and series, chapters 6 and 7's
  // decade and length bar. Local to the page, never in the URL. They belong
  // to the selection they were opened under (`key`), so a different
  // selection (a click, or the back button) starts with none open, and
  // coming back to the old one doesn't reopen them.
  const selKey = !selection ? '' : selection.kind === 'genre' ? `genre:${selection.genre}` : `wing:${selection.wing}`;
  const [picks, setPicks] = useState<Picks>(NO_PICKS);
  const open = picks.key === selKey ? picks : NO_PICKS;
  const pick = (field: keyof Omit<Picks, 'key'>, value: string | null) =>
    setPicks({ ...open, key: selKey, [field]: value } as Picks);
  const authorPick = open.author;
  const seriesPick = open.series;
  const decadePick = open.decade;
  const bandPick = open.band;

  // Everything below that depends only on the whole shelf is worked out
  // once per book list, not on every click.
  const { genres, full, genreBubbles, shelfDecades, shelfLengths, text } = useMemo(
    () => ({
      genres: storyGenres(books),
      full: wheel(books),
      genreBubbles: bubbles(books),
      shelfDecades: decades(books),
      shelfLengths: lengths(books),
      text: commentary(books),
    }),
    [books]
  );
  const zoom: Wing | null =
    selection?.kind === 'wing'
      ? selection.wing
      : selection?.kind === 'genre' && openWing && full.rows.some((r) => r.wing === openWing && r.genre === selection.genre)
        ? openWing
        : null;
  const shownWheel = zoom ? wheel(books, zoom) : full;

  const choose = (next: Selection) => {
    if (!next) setOpenWing(null);
    if (next?.kind === 'wing') setOpenWing(next.wing);
    select(next);
  };
  // Clicking the open wing closes it (keeping a selected genre); another
  // wing opens.
  const onWing = (wing: Wing) => {
    if (zoom !== wing) choose({ kind: 'wing', wing });
    else if (selection?.kind === 'genre') setOpenWing(null);
    else choose(null);
  };
  // Clicking the selected genre again clears it, back to the open wing if any.
  const onGenre = (genre: string) =>
    choose(
      selection?.kind === 'genre' && selection.genre === genre
        ? zoom
          ? { kind: 'wing', wing: zoom }
          : null
        : { kind: 'genre', genre }
    );

  const chosen = filterBooks(books, selection);
  const label = selection ? selectionLabel(selection) : undefined;
  const f = figures(chosen);
  // The live lines speak for a selection; with none, the commentary covers it.
  const lines = selection ? liveLines(chosen, selection) : null;
  const selectedGenre = selection?.kind === 'genre' ? selection.genre : undefined;

  // 4. How the genres compare: the bubbles are always the whole shelf's.
  const people = crowd(chosen);
  // 5. Who wrote them
  const authors = topAuthors(chosen);
  const series = topSeries(chosen);
  // A drill-down stays open only while its row is still in the (filtered)
  // top 10, so a new selection quietly resets it.
  const authorRow = authors.rows.find((r) => r.label === authorPick);
  const seriesRow = series.rows.find((r) => r.label === seriesPick);
  // What the drill-downs compare against: whatever the story shows now.
  const baseline = crowdAverage(chosen);
  const against = label ?? 'the shelf';
  // 6. When: the selection's decades over the shelf's.
  const chosenDecades = decades(chosen);
  const { oldest, newest } = oldestAndNewest(chosen);
  // An open bar stays open only while it still has books in the selection.
  const decadeBooks = decadePick ? booksInDecade(chosen, decadePick) : [];
  const openDecade = decadeBooks.length > 0 ? decadePick : null;
  // 7. How long
  const chosenLengths = lengths(chosen);
  const lead = longestBooks(chosen, 1)[0];
  const slim = slimmest(chosen);
  const bandBooks = bandPick ? booksInLength(chosen, bandPick) : [];
  const openBand = bandBooks.length > 0 ? bandPick : null;

  // The ruled entry, left to right.
  const entry: { head: string; value: string; unit?: string; note?: string }[] = [
    { head: 'On the shelves', value: number(f.books), unit: f.books === 1 ? 'book' : 'books' },
    { head: 'Penned by', value: number(f.authors), unit: f.authors === 1 ? 'author' : 'authors' },
    {
      head: 'A typical book',
      value: f.medianPages !== undefined ? number(f.medianPages) : '–',
      unit: f.medianPages !== undefined ? 'pages' : undefined,
    },
    { head: 'My reading era', value: f.era ? `${f.era.decade}s` : '–' },
    { head: 'Fiction', value: `${Math.round(f.fictionShare * 100)}%` },
  ];

  return (
    <div>
      {/* The one announcement for a selection change (the five live lines
          below are plain text, so a change isn't read out five times). */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {selection ? `Showing ${selectionLabel(selection)}: ${plural(f.books, 'book')}.` : ''}
      </p>

      {/* "On this page": in the margin on wide screens, a row here on medium
          ones, a fading card in the bottom-left corner on phones. */}
      <PageIndex items={CHAPTERS} />

      {/* 2. What's on the shelves */}
      <section className="ledger-block" aria-labelledby="story-shelves">
        <h2 id="story-shelves" className="subhead">
          What&rsquo;s on the shelves
        </h2>
        <p className="prose">{text.shelves}</p>
        {/* One entry ruled into a ledger: blue lines across, red rules
            between the columns, the figures in ink. */}
        <p className="ledger-tallied">
          {selection && `${selectionLabel(selection)} · `}Tallied {tallied}
        </p>
        <dl className="ledger-entry">
          {entry.map((col) => (
            <div key={col.head}>
              <dt>{col.head}</dt>
              <dd>
                {col.value}
                {col.unit && <small> {col.unit}</small>}
              </dd>
              {col.note && <dd className="ledger-entry-note">{col.note}</dd>}
            </div>
          ))}
        </dl>
        <p className="ledger-footnote">
          A typical book is the median across the {plural(f.booksWithPages, 'book')} with a page count on file; the
          reading era counts first-published years.
        </p>
      </section>

      {/* 3. What it's made of */}
      <section className="ledger-block" aria-labelledby="story-made-of">
        <h2 id="story-made-of" className="subhead">
          What it&rsquo;s made of
        </h2>
        <p className="prose">{text.madeOf}</p>
        <LiveLine text={lines?.madeOf} />
        <p className="ledger-note">
          Each book sits in the wheel once, under its most specific genre (the one on the fewest books), so the
          rings add up.
        </p>
        <Hint>
          Tap or click a wing to open it out, or a genre to follow it through the rest of the story.
        </Hint>
        <WheelChart
          wheel={shownWheel}
          zoom={zoom}
          selected={selectedGenre}
          onWing={onWing}
          onGenre={onGenre}
        />
        <p className="ledger-footnote">
          Inside, the two wings; outside, their genres. Picking a genre follows every book tagged with it, not only
          the ones filed under it.
          {full.untagged > 0 && ` ${plural(full.untagged, 'book')} with no genre tag ${full.untagged === 1 ? 'isn’t' : 'aren’t'} in the wheel.`}
          {full.noWing > 0 && ` Nor ${full.noWing === 1 ? 'is' : 'are'} ${plural(full.noWing, 'book')} tagged neither Fiction nor Non-Fiction.`}
        </p>
      </section>

      <FilterBar selection={selection} genres={genres} onChoose={choose} />

      {/* 4. How the genres compare */}
      <section className="ledger-block" aria-labelledby="story-compare">
        <h2 id="story-compare" className="subhead">
          How the genres compare
        </h2>
        <p className="prose">{text.compare}</p>
        <LiveLine text={lines?.compare} />
        {genreBubbles.length > 0 && <BubbleChart rows={genreBubbles} books={books} selected={selectedGenre} />}
        <p className="ledger-footnote">
          The {genreBubbles.length} genres with the most books, each bubble sized by how many. Neither scale starts at
          zero, so the gaps look bigger than they are. Opening a bubble doesn&rsquo;t change what the rest of the
          story shows.
        </p>

        <div className="ledger-pair">
          <section aria-labelledby="story-favourites">
            <h3 id="story-favourites" className="ledger-subhead">
              Crowd favourites{label && ` · ${label}`}
            </h3>
            {people.favourites.length > 0 ? (
              <BookList books={people.favourites} unit="rating" />
            ) : (
              <p className="ledger-note">Too few rated books here to pick favourites.</p>
            )}
          </section>
          <section aria-labelledby="story-sceptics">
            <h3 id="story-sceptics" className="ledger-subhead">
              Crowd sceptics{label && ` · ${label}`}
            </h3>
            {people.sceptics.length > 0 ? (
              <BookList books={people.sceptics} unit="rating" />
            ) : (
              <p className="ledger-note">Too few rated books here to pick sceptics.</p>
            )}
          </section>
        </div>
        {people.perfect > 0 && (
          <p className="ledger-footnote">
            {plural(people.perfect, 'perfect 5.0')} left out of the favourites: a handful of votes, not a crowd.
          </p>
        )}
      </section>

      {/* 5. Who wrote them */}
      <section className="ledger-block" aria-labelledby="story-who">
        <h2 id="story-who" className="subhead">
          Who wrote them
        </h2>
        <p className="prose">{text.who}</p>
        <LiveLine text={lines?.who} />
        <div className="ledger-pair">
          <section aria-labelledby="story-authors">
            <h3 id="story-authors" className="ledger-subhead">
              Most-shelved authors
            </h3>
            {authorRow ? (
              <AuthorDrill
                row={authorRow}
                books={chosen}
                baseline={baseline}
                against={against}
                onBack={() => pick('author', null)}
              />
            ) : (
              <>
                <p className="ledger-note">
                  {number(authors.single)} of {plural(authors.authors, 'author')}{' '}
                  {authors.single === 1 ? 'has' : 'have'} one book here.
                </p>
                {authors.rows.length > 0 && (
                  <>
                    <Hint>Tap or click a bar to see an author&rsquo;s books over the years.</Hint>
                    <RankedBars
                      rows={authors.rows}
                      caption="Books per author"
                      column="Author"
                      summary={`Top ${authors.rows.length} authors by books${label ? ` in ${label}` : ' on the shelves'}${authors.rows[0] ? `, led by ${authors.rows[0].label} with ${authors.rows[0].count}` : ''}.`}
                      onPick={(r) => pick('author', r.label)}
                    />
                  </>
                )}
              </>
            )}
            {authors.noAuthor > 0 && (
              <p className="ledger-footnote">{plural(authors.noAuthor, 'book')} with no author on file.</p>
            )}
          </section>
          <section aria-labelledby="story-series">
            <h3 id="story-series" className="ledger-subhead">
              Longest series
            </h3>
            {seriesRow ? (
              <SeriesDrill
                row={seriesRow}
                books={chosen}
                baseline={baseline}
                against={against}
                onBack={() => pick('series', null)}
              />
            ) : series.rows.length > 0 ? (
              <>
                <p className="ledger-note">
                  {plural(series.inSeries, 'book')} {series.inSeries === 1 ? 'belongs' : 'belong'} to one of{' '}
                  {number(series.series)} series.
                </p>
                <Hint>Tap or click a bar to see how a series holds up, book by book.</Hint>
                <RankedBars
                  rows={series.rows}
                  caption="Books per series"
                  column="Series"
                  summary={`Top ${series.rows.length} series by books${label ? ` in ${label}` : ' on the shelves'}, led by ${series.rows[0].label} with ${series.rows[0].count}.`}
                  onPick={(r) => pick('series', r.label)}
                />
              </>
            ) : (
              <p className="ledger-note">No series {label ? `in ${label}` : 'on the shelves'}.</p>
            )}
          </section>
        </div>
      </section>

      {/* 6. When they were written */}
      <section className="ledger-block" aria-labelledby="story-when">
        <h2 id="story-when" className="subhead">
          When they were written
        </h2>
        <p className="prose">{text.when}</p>
        <LiveLine text={lines?.when} />
        <div className="story-split">
          <div>
            {openDecade ? (
              <DecadeDrill
                decade={openDecade}
                here={decadeBooks}
                overall={chosen}
                leaveOut={selectedGenre}
                baseline={baseline}
                against={against}
                onBack={() => pick('decade', null)}
              />
            ) : (
              <>
                <Hint>Tap or click a decade to see what its books lean towards.</Hint>
                <OverlayColumns
                  rows={overlay(shelfDecades.rows, selection ? chosenDecades.rows : undefined)}
                  chosenLabel={label}
                  caption="Books per decade first published"
                  column="Decade"
                  summary={
                    label
                      ? `Books per decade of first publication: ${label} against the whole shelf, as shares.`
                      : 'Books per decade of first publication, from before 1900 to now.'
                  }
                  onPick={(label) => pick('decade', label)}
                />
              </>
            )}
            {chosenDecades.noYear > 0 && (
              <p className="ledger-footnote">
                {plural(chosenDecades.noYear, 'book')} with no year on file
                {chosenDecades.noYear === 1 ? ' isn’t' : ' aren’t'} counted.
              </p>
            )}
          </div>
          {oldest && (
            <div className="story-covers">
              <LabelledCard label="The oldest" detail={`first published ${oldest.year}`} book={oldest.book} />
              {newest && newest.book !== oldest.book && (
                <LabelledCard label="The newest" detail={`first published ${newest.year}`} book={newest.book} />
              )}
            </div>
          )}
        </div>
      </section>

      {/* 7. How long they run */}
      <section className="ledger-block" aria-labelledby="story-length">
        <h2 id="story-length" className="subhead">
          How long they run
        </h2>
        <p className="prose">{text.length}</p>
        <LiveLine text={lines?.length} />
        <div className="story-split">
          <div>
            {openBand ? (
              <LengthDrill
                band={openBand}
                here={bandBooks}
                leaveOut={selectedGenre}
                baseline={baseline}
                against={against}
                onBack={() => pick('band', null)}
              />
            ) : (
              <>
                <Hint>Tap or click a bar to zoom into its longest books.</Hint>
                <OverlayColumns
                  rows={overlay(shelfLengths.rows, selection ? chosenLengths.rows : undefined)}
                  chosenLabel={label}
                  caption="Books per 100 pages"
                  column="Pages"
                  summary={
                    label
                      ? `Books by page count in bins of 100 pages: ${label} against the whole shelf, as shares.`
                      : 'Books by page count, in bins of 100 pages.'
                  }
                  onPick={(label) => pick('band', label)}
                />
              </>
            )}
            {chosenLengths.noPages > 0 && (
              <p className="ledger-footnote">
                {plural(chosenLengths.noPages, 'book')} with no page count on file
                {chosenLengths.noPages === 1 ? ' isn’t' : ' aren’t'} counted.
              </p>
            )}
          </div>
          {lead && (
            <div className="story-covers">
              <LabelledCard label="The longest" detail={`${number(lead.pages)} pages`} book={lead} />
              {slim && slim !== lead && (
                <LabelledCard label="The slimmest" detail={`${number(slim.pages)} pages`} book={slim} />
              )}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
