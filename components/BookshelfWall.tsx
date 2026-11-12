'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useDoorOpening } from '@/hooks/useDoorOpening';

/**
 * The Catalog door on the home page: one bay of a short run of built-in
 * library shelves.
 *
 * Three bays (25% / 50% / 25%) under one cornice and over one plinth, the
 * shelf lines running straight across, finished at each end by a walnut
 * end panel with the cornice and plinth returning over it. The middle bay
 * is the door: nothing marks it but a hairline joint and a faint glint of
 * light at its right edge. The books are one graded photo
 * ("Antique books and encyclopedias", Annie Spratt, CC0) composed into a
 * wider wall (public/textures/bookshelf-wall.jpg: mirrored to the left,
 * wrapped to the right), so every bay shows its own stretch of the same
 * shelves. The lever, "History of the World", is cut from the same photo.
 *
 * Click: the book tips, the door pops back as the catch releases, then
 * slides left behind the left bay, and the room behind (`children`,
 * usually <DoorInside>) draws you in. Held 2.7s; always shut at rest with
 * a mouse. The look and motion are in globals.css (.bookshelf-wall*).
 */
export default function BookshelfWall({
  href,
  title,
  blurb,
  children,
}: {
  href: string;
  title: string;
  blurb: string;
  children: ReactNode;
}) {
  const { ref, onClick } = useDoorOpening(href, { holdMs: 2700, desktopRest: 'shut' });

  /** A puck light (or its cone of light) under each of the three shelves —
      the top of the case, the upper shelf, the lower shelf — in one bay. */
  const lights = (bay: 'left' | 'right' | 'door', part: 'puck' | 'glow') =>
    (['top', 'mid', 'low'] as const).map((level) => (
      <span
        key={`${part}-${bay}-${level}`}
        className={`bookshelf-wall-${part} bookshelf-wall-${part}--${bay} bookshelf-wall-${part}--${level}`}
      />
    ));

  return (
    <Link href={href} ref={ref} onClick={onClick} className="bookshelf-wall">
      <span className="door-piece">
        <span className="bookshelf-wall-run">
          <span className="bookshelf-wall-cornice" aria-hidden="true" />
          <span className="bookshelf-wall-rail">
            <span className="bookshelf-wall-card">{title}</span>
          </span>
          <span className="bookshelf-wall-face" aria-hidden="true">
            {/* The outer bays' light cones (dark theme only), one per shelf. */}
            {lights('left', 'glow')}
            {lights('right', 'glow')}
            <span className="bookshelf-wall-room">{children}</span>
            <span className="bookshelf-wall-door">
              <span className="bookshelf-wall-gap" />
              <span className="bookshelf-wall-lever" />
              <span className="bookshelf-wall-shading" />
              <span className="bookshelf-wall-board bookshelf-wall-board--top" />
              <span className="bookshelf-wall-board bookshelf-wall-board--1" />
              <span className="bookshelf-wall-board bookshelf-wall-board--2" />
              <span className="bookshelf-wall-board bookshelf-wall-board--bottom" />
              {/* The door's own lights, fixed to its shelves: they slide
                  away with it, as fittings on a real secret door would. */}
              {lights('door', 'glow')}
              {lights('door', 'puck')}
            </span>
            <span className="bookshelf-wall-bay bookshelf-wall-bay--left">
              <span className="bookshelf-wall-shading" />
              <span className="bookshelf-wall-board bookshelf-wall-board--top" />
              <span className="bookshelf-wall-board bookshelf-wall-board--1" />
              <span className="bookshelf-wall-board bookshelf-wall-board--2" />
              <span className="bookshelf-wall-board bookshelf-wall-board--bottom" />
            </span>
            <span className="bookshelf-wall-bay bookshelf-wall-bay--right">
              <span className="bookshelf-wall-shading" />
              <span className="bookshelf-wall-board bookshelf-wall-board--top" />
              <span className="bookshelf-wall-board bookshelf-wall-board--1" />
              <span className="bookshelf-wall-board bookshelf-wall-board--2" />
              <span className="bookshelf-wall-board bookshelf-wall-board--bottom" />
            </span>
            <span className="bookshelf-wall-stile bookshelf-wall-stile--left" />
            <span className="bookshelf-wall-stile bookshelf-wall-stile--right" />
            <span className="bookshelf-wall-end bookshelf-wall-end--left" />
            <span className="bookshelf-wall-end bookshelf-wall-end--right" />
            {/* Small round brass puck lights under every shelf of the outer
                bays (the door has its own). */}
            {lights('left', 'puck')}
            {lights('right', 'puck')}
          </span>
          <span className="bookshelf-wall-plinth" aria-hidden="true" />
        </span>
      </span>
      <span className="bookshelf-wall-blurb">{blurb}</span>
    </Link>
  );
}
