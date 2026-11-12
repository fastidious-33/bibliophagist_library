'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, type MouseEvent } from 'react';

/** Default time the doors stand open (and the room draws you in) before
    the page changes: the armoire and the castle. The same on desktop and
    on phones. */
const DEFAULT_HOLD_MS = 2300;

type DoorOptions = {
  /** How long to hold the doors open before navigating. */
  holdMs?: number;
  /** Resting state with a mouse: 'random' (shut or ajar, per page load) or
      'shut' (always closed, e.g. the secret bookshelf). */
  desktopRest?: 'random' | 'shut';
};

/**
 * Behaviour shared by the home page doors (BookshelfWall, CastleDoor).
 * Attach `ref` and `onClick` to the door's <Link>.
 *
 * - Resting state is picked per page load and set on the DOM after mount,
 *   not rendered, so the server's shut doors never mismatch on hydration
 *   and an ajar door eases open by itself. With a mouse: data-rest="shut" |
 *   "ajar" (at random unless desktopRest is 'shut'). On touch screens there
 *   is no hover to peek with, so one door always stands ajar:
 *   data-rest="ajar-one" plus data-ajar-leaf="left" | "right", at random.
 * - A plain click opens the doors (data-opening) and navigates after
 *   holdMs, so the visitor sees what's inside first. Modified clicks (new
 *   tab/window) and reduced motion go straight through to the Link.
 *
 * All the movement is CSS (globals.css, .wardrobe*, .castle*, .bookshelf*).
 */
export function useDoorOpening(
  href: string,
  { holdMs = DEFAULT_HOLD_MS, desktopRest = 'random' }: DoorOptions = {},
) {
  const ref = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(hover: none)').matches) {
      el.dataset.rest = 'ajar-one';
      el.dataset.ajarLeaf = Math.random() < 0.5 ? 'left' : 'right';
    } else if (desktopRest === 'shut') {
      el.dataset.rest = 'shut';
    } else {
      el.dataset.rest = Math.random() < 0.5 ? 'shut' : 'ajar';
    }

    // Coming back via the browser's back/forward cache restores the page as
    // it was left: doors wide open. Close them again.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) delete el.dataset.opening;
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      window.clearTimeout(timer.current);
    };
  }, [desktopRest]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // From here the Link must not navigate on its own.
    event.preventDefault();
    const el = ref.current;
    if (!el || el.dataset.opening !== undefined) return;

    el.dataset.opening = '';
    router.prefetch(href);
    timer.current = window.setTimeout(() => router.push(href), holdMs);
  };

  return { ref, onClick };
}
