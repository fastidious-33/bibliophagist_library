'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function useUrlPage(paramName = 'page') {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get(paramName)) || 1;

  const search = searchParams.toString();

  // Held in a ref rather than a dependency. setPage must keep a stable
  // identity, because CatalogBrowser lists it in the dependency array of
  // its page-reset effect — a new identity there retriggers the reset and
  // knocks you back to page 1. The ref keeps the value current without
  // rebuilding the callback.
  const searchRef = useRef(search);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const setPage = useCallback(
    (n: number) => {
      const params = new URLSearchParams(searchRef.current);
      params.set(paramName, String(n));
      window.history.pushState(null, '', `${pathname}?${params.toString()}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [paramName, pathname]
  );

  return { page, setPage };
}