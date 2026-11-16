'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/**
 * One entry: `id` jumps to a section on this page; `href` opens another
 * page instead (Browse's destinations, the Librarian's rooms).
 */
export type PageIndexItem = { label: string; id?: string; href?: string };

/** Fewer entries than this and there's nothing to choose between. */
const MIN_ITEMS = 2;

/** Phones: how long the index shows when the page opens. */
const SHOW_ON_LOAD = 1000;
/** Phones: how long it lingers after scrolling stops (time to tap). */
const LINGER = 1000;
/** Phones: a pause in scrolling this long ends a scroll. */
const SCROLL_IDLE = 400;
/** Phones: a scroll must cover this much of the screen to bring it back. */
const REAL_SCROLL = 0.6;
/** Phones: after a jump, the jump's own scrolling doesn't bring it back. */
const AFTER_JUMP = 1500;
/** Phones: the gap between the index and whatever it sits below. */
const CLEARANCE = 8;

const PHONE = '(max-width: 719.98px)';

/**
 * "On this page": links to a page's sections (and, on hub pages, to the
 * pages under them), with the section you're reading marked. One
 * component, three shapes by screen width (globals.css, "Page index"):
 *
 * - wide screens: a slim list in the left margin that stays in view;
 * - medium screens: one row of links where it's placed in the page;
 * - phones: the same list mirrored into the top-right corner (names
 *   right-aligned against a thin rule, the current one marked with a red
 *   edge), with no box behind it. It sits just below the site header
 *   while that's on screen, and below the Story's filter bar once that's
 *   stuck. It shows for a moment when the page opens and comes back when
 *   you really scroll (a flick, or most of a screen, not the small nudges
 *   of reading); it lingers a moment after you stop, stays while touched,
 *   and fades. Only the names take taps. Always there for keyboards and
 *   screen readers: it shows when tabbed into, and fading only hides it
 *   from sight.
 *
 * `phoneOnly`: for short pages, which get the phone index but nothing on
 * wider screens. Jumping to a folded section (a <details>) opens it. Place
 * it where the row should sit on medium screens; elsewhere it moves out of
 * the flow.
 */
export default function PageIndex({ items, phoneOnly = false }: { items: PageIndexItem[]; phoneOnly?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  // Phones only (wider screens ignore it): shown at first, for the
  // moment after the page opens.
  const [shown, setShown] = useState(true);
  const nav = useRef<HTMLElement>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const quietUntil = useRef(0);

  // The section ids as one string, so the observer below follows the ids and
  // isn't rebuilt when a caller hands over a new array with the same ones.
  const sectionIds = items.flatMap((item) => (item.id ? [item.id] : [])).join('\n');

  // The section in the reading band (a strip ~40% down the window).
  useEffect(() => {
    const targets = sectionIds
      .split('\n')
      .map((id) => (id ? document.getElementById(id) : null))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  // Phones: where it sits, and when it shows and fades.
  useEffect(() => {
    const phone = window.matchMedia(PHONE);

    // Just below the site header while it's on screen, below the Story's
    // filter bar once that's stuck to the top, else near the top edge.
    // Phones only: --index-top is only read inside the phone media query, so
    // wider screens skip the measuring (it forces the browser to re-lay-out).
    const place = () => {
      if (!phone.matches) return;
      let top = 12;
      const header = document.querySelector('.site-header')?.getBoundingClientRect();
      if (header && header.bottom > 0) top = Math.max(top, header.bottom + CLEARANCE);
      const bar = document.querySelector('.story-bar')?.getBoundingClientRect();
      if (bar && bar.top <= 1 && bar.bottom > 0) top = Math.max(top, bar.bottom + CLEARANCE);
      nav.current?.style.setProperty('--index-top', `${Math.round(top)}px`);
    };
    place();

    // At most one placement per screen redraw, however many scroll or
    // resize events arrive before it.
    let frame: number | undefined;
    const placeSoon = () => {
      if (frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        place();
      });
    };

    const hideIn = (ms: number) => {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => {
        if (!held.current) setShown(false);
      }, ms);
    };
    hideIn(SHOW_ON_LOAD);

    let lastY = window.scrollY;
    let travelled = 0;
    let idle: number | undefined;
    const onScroll = (e: Event) => {
      placeSoon();
      const y = window.scrollY;
      travelled += Math.abs(y - lastY);
      lastY = y;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        travelled = 0;
      }, SCROLL_IDLE);
      if (!phone.matches || e.timeStamp < quietUntil.current) return;
      if (travelled > window.innerHeight * REAL_SCROLL) {
        setShown(true);
        hideIn(LINGER);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', placeSoon);
    // Crossing the phone breakpoint (rotating, resizing the window): place it
    // straight away, so it isn't left at its default until the next scroll.
    phone.addEventListener('change', place);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', placeSoon);
      phone.removeEventListener('change', place);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (items.length < MIN_ITEMS) return null;

  // While a finger is on it, it stays; letting go starts the linger.
  const hold = () => {
    held.current = true;
    window.clearTimeout(hideTimer.current);
  };
  const release = () => {
    held.current = false;
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShown(false), LINGER);
  };

  // `at` is the click's own timestamp (same clock as the scroll events'),
  // so the jump's scrolling can be told apart without reading the clock
  // during render.
  const jump = (id: string, at: number) => {
    held.current = false;
    setShown(false);
    quietUntil.current = at + AFTER_JUMP;
    const el = document.getElementById(id);
    // A folded section opens as you jump to it.
    const fold = el instanceof HTMLDetailsElement ? el : el?.closest('details');
    if (fold) fold.open = true;
  };

  return (
    <nav
      ref={nav}
      className={`page-index${shown ? ' is-shown' : ''}${phoneOnly ? ' page-index--phone-only' : ''}`}
      aria-label="On this page"
      onPointerDown={hold}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="page-index-inner">
        <p className="page-index-label" aria-hidden="true">
          On this page
        </p>
        <ul>
          {items.map((item) => (
            <li key={item.id ?? item.href ?? item.label}>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <a
                  href={`#${item.id}`}
                  className={active === item.id ? 'is-active' : undefined}
                  aria-current={active === item.id ? 'location' : undefined}
                  onClick={(e) => item.id && jump(item.id, e.timeStamp)}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
