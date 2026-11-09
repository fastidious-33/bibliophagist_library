'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import BookCard from '@/components/BookCard';
import MultiSelectFilter, { type FilterOption } from '@/components/MultiSelectFilter';
import Pagination from '@/components/Pagination';
import RandomBookLink from '@/components/RandomBookLink';
import { useCatalogUrl } from '@/hooks/useCatalogUrl';
import { YEAR_BANDS, SORT_OPTIONS } from '@/lib/typesense/catalog-facets';
import { PAGE_SIZE, type BooksSearchResponse, type BookHit } from '@/lib/typesense/search';

const DEBOUNCE_MS = 300;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Wraps whichever tokens Typesense says matched. Built from the plain text
 * plus a token list rather than Typesense's pre-marked HTML snippet, so
 * nothing from the dataset is ever injected as markup.
 */
function Highlighted({ text, tokens }: { text: string; tokens?: string[] }) {
  const parts = useMemo(() => {
    if (!tokens || tokens.length === 0) return null;
    const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'ig');
    return text.split(pattern);
  }, [text, tokens]);

  if (!parts) return <>{text}</>;

  // String.split with a capture group alternates: even indices are the
  // surrounding text, odd indices are the matches.
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <mark key={i}>{part}</mark> : part
      )}
    </>
  );
}

export default function CatalogBrowser({ initialData }: { initialData: BooksSearchResponse }) {
  const { state, search, setPage, setQuery, setMulti, setSort, clearAll, hasActiveFilters } =
    useCatalogUrl();

  const [data, setData] = useState<BooksSearchResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The input is kept locally so typing stays instant; the URL is only
  // written after the debounce. Re-synced when the URL changes underneath
  // us — a back navigation, or Clear all.
  const [queryInput, setQueryInput] = useState(state.q);
  const lastPushedQuery = useRef(state.q);

  useEffect(() => {
    if (state.q !== lastPushedQuery.current) {
      setQueryInput(state.q);
      lastPushedQuery.current = state.q;
    }
  }, [state.q]);

  useEffect(() => {
    if (queryInput.trim() === state.q) return;
    const timer = setTimeout(() => {
      lastPushedQuery.current = queryInput.trim();
      setQuery(queryInput);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [queryInput, state.q, setQuery]);

  const abortRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  /**
   * One effect, one dependency: the URL's query string. Because all state
   * now lives in the URL, this replaces the previous pair of effects and
   * the skipNextFilterReset flag they needed to avoid looping. Page resets
   * happen inside the setters, not here.
   *
   * No debounce — the text input debounces before it writes to the URL, so
   * by the time we get here every change is a deliberate one. Clicking a
   * page or ticking a filter used to sit through 300ms of nothing.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false; // SSR already rendered this exact state
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetch(`/api/books/search?${search}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Search failed.');
        }
        return res.json() as Promise<BooksSearchResponse>;
      })
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return; // superseded
        setError(err.message || 'Search failed. Please try again.');
        setLoading(false);
      });
  }, [search]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const themeOptions: FilterOption[] = data.options.theme.map((v) => ({ value: v, label: v }));
  const bandOptions: FilterOption[] = YEAR_BANDS.filter((b) =>
    data.options.bands.includes(b.id)
  ).map((b) => ({ value: b.id, label: b.label }));

  const rangeStart = data.found === 0 ? 0 : (data.page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(data.page * PAGE_SIZE, data.found);

  return (
    <>
      <div className="catalog-toolbar">
        <span className="slip-label">Search slip</span>
        <input
          type="search"
          name="q"
          autoComplete="off"
          spellCheck={false}
          placeholder="Title, author, theme, or tag…"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          aria-label="Search the catalog"
        />

        {hasActiveFilters && (
          <button type="button" className="clear-filters-btn" onClick={clearAll}>
            Clear all filters
          </button>
        )}

        <MultiSelectFilter
          label="Themes"
          searchable={false}
          typeahead
          options={themeOptions}
          selected={state.theme}
          onChange={(next) => setMulti('theme', next)}
        />

        <MultiSelectFilter
          label="Years"
          searchable={false}
          options={bandOptions}
          selected={state.band}
          onChange={(next) => setMulti('band', next)}
        />

        <label className="catalog-sort">
          <span className="visually-hidden">Sort by</span>
          <select value={state.sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="catalog-count" aria-live="polite">
        {loading
          ? 'Searching…'
          : `Showing ${rangeStart}–${rangeEnd} of ${data.found} ${data.found === 1 ? 'entry' : 'entries'}`}
      </p>

      {error && (
        <p className="catalog-error" role="alert">
          {error}
        </p>
      )}

      <h2 className="visually-hidden">All books</h2>

      {!loading && data.books.length === 0 ? (
        <div className="catalog-empty">
          <p>No entries match these filters.</p>
          <div className="btn-row">
            {hasActiveFilters && (
              <button type="button" className="btn btn-secondary" onClick={clearAll}>
                Clear all filters
              </button>
            )}
            <RandomBookLink className="btn btn-secondary" />
          </div>
        </div>
      ) : (
        <div className="catalog-strip" data-loading={loading || undefined}>
          {data.books.map((book: BookHit) => (
            <BookCard
              key={book.id}
              slug={book.slug}
              title={<Highlighted text={book.title} tokens={book.matched?.title} />}
              author={<Highlighted text={book.author} tokens={book.matched?.author} />}
              coverUrl={book.coverUrl}
              theme={book.theme}
              language={book.language}
              rating={book.rating}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={data.page}
        totalPages={data.totalPages}
        onPageChange={setPage}
        ariaLabel="Catalog pages"
      />
    </>
  );
}
