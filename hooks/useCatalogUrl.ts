'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { FILTER_KEYS, type FilterKey } from '@/lib/search/types';

export interface CatalogState {
  q: string;
  tags: string[];
  series: string[];
  band: string[];
  sort: string;
  page: number;
}

/**
 * The catalog's entire state lives in the URL, so every view is shareable,
 * bookmarkable and survives a refresh — and so the back button steps
 * through it.
 *
 * Updates go through the native History API rather than router.push. The
 * App Router has no shallow-routing option: router.push/replace both
 * trigger a server round trip that re-renders app/catalog/page.tsx, which
 * runs a search — so every click cost two searches, one from the RSC
 * re-render and one from this component's own fetch. Next patches
 * pushState/replaceState so useSearchParams still sees the change.
 *
 * IMPORTANT: every setter below must keep a stable identity across renders.
 * Reading `search` directly inside them would rebuild them on every URL
 * change, and any effect listing a setter in its dependencies would then
 * re-run on navigation — which is exactly how an earlier version knocked
 * you back to page 1 a moment after reaching page 2. The ref keeps the
 * value current without touching identity.
 */
export function useCatalogUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const state: CatalogState = useMemo(() => {
    const sp = new URLSearchParams(search);
    return {
      q: sp.get('q') || '',
      tags: sp.getAll('tags'),
      series: sp.getAll('series'),
      band: sp.getAll('band'),
      sort: sp.get('sort') || 'relevance',
      page: Math.max(1, Number(sp.get('page')) || 1),
    };
  }, [search]);

  const write = useCallback(
    (mutate: (sp: URLSearchParams) => void, mode: 'push' | 'replace') => {
      const sp = new URLSearchParams(searchRef.current);
      mutate(sp);

      // Tidy: drop page=1 so the canonical first page has a clean URL.
      if (sp.get('page') === '1') sp.delete('page');

      const qs = sp.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (mode === 'push') {
        window.history.pushState(null, '', url);
      } else {
        window.history.replaceState(null, '', url);
      }
      // Keep the ref in step immediately — the effect above won't have run
      // yet if two writes happen in the same tick.
      searchRef.current = qs;
    },
    [pathname]
  );

  /**
   * Page changes PUSH: "page 3" is a destination worth returning to, so it
   * earns a history entry. Everything else REPLACES — typing a query or
   * ticking a filter is refinement, and one entry per keystroke would make
   * the back button useless.
   */
  const setPage = useCallback(
    (n: number) => {
      write((sp) => sp.set('page', String(n)), 'push');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [write]
  );

  const setQuery = useCallback(
    (value: string) => {
      write((sp) => {
        const trimmed = value.trim();
        if (trimmed) sp.set('q', trimmed);
        else sp.delete('q');
        sp.delete('page'); // a new query invalidates your position
      }, 'replace');
    },
    [write]
  );

  const setMulti = useCallback(
    (key: FilterKey, values: string[]) => {
      write((sp) => {
        sp.delete(key);
        values.forEach((v) => sp.append(key, v));
        sp.delete('page');
      }, 'replace');
    },
    [write]
  );

  const setSort = useCallback(
    (id: string) => {
      write((sp) => {
        if (id && id !== 'relevance') sp.set('sort', id);
        else sp.delete('sort');
        sp.delete('page');
      }, 'replace');
    },
    [write]
  );

  const clearAll = useCallback(() => {
    write((sp) => {
      ['q', ...FILTER_KEYS, 'sort', 'page'].forEach((k) => sp.delete(k));
    }, 'replace');
  }, [write]);

  const hasActiveFilters =
    state.q !== '' || state.tags.length > 0 || state.series.length > 0 || state.band.length > 0;

  return { state, search, setPage, setQuery, setMulti, setSort, clearAll, hasActiveFilters };
}
