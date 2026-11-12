'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import Ivy from '@/components/Ivy';
import { useDoorOpening } from '@/hooks/useDoorOpening';

/**
 * The castle door on the home page: a doorway in an old, weathered stone
 * wall that crumbles away at its edges, overgrown with ivy. The name is
 * cut into a dressed stone above a pointed arch; an iron lantern hangs
 * beside it, lit after dark. The two oak doors are modelled on surviving
 * medieval doors: vertical planks, crescent-ended iron strap hinges, ring
 * pulls, an iron peephole grille, and a small wicket door cut into one
 * leaf. They open inward, away from the viewer. What's behind them is
 * `children`, usually <DoorInside>.
 *
 * Opening behaviour lives in useDoorOpening; the look and the swing are in
 * globals.css (.castle*).
 */
export default function CastleDoor({
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
  const { ref, onClick } = useDoorOpening(href);

  const leaf = (side: 'left' | 'right') => (
    <span className={`castle-leaf castle-leaf--${side}`}>
      <span className="castle-strap castle-strap--top" />
      <span className="castle-strap castle-strap--bottom" />
      {side === 'left' ? <span className="castle-grille" /> : <span className="castle-wicket" />}
      <span className="castle-ring" />
    </span>
  );

  return (
    <Link href={href} ref={ref} onClick={onClick} className="castle">
      {/* The masonry, kept apart from the blurb so the pieces can share a
          floor line (globals.css, .door-piece). */}
      <span className="door-piece">
        <span className="castle-wall">
          <span className="castle-archway" aria-hidden="true">
            <span className="castle-opening">
              {children}
              {leaf('left')}
              {leaf('right')}
            </span>
          </span>
          <Ivy />
          <span className="castle-name">{title}</span>
          {/* Wall lantern: bolted plate, arm and brace, a ring, then the
              lantern itself (roof, glazed cage with a candle, drop finial). */}
          <span className="castle-lantern" aria-hidden="true">
            <span className="castle-lantern-plate" />
            <span className="castle-lantern-arm" />
            <span className="castle-lantern-ring" />
            <span className="castle-lantern-roof" />
            <span className="castle-lantern-cage" />
            <span className="castle-lantern-foot" />
          </span>
        </span>
        <span className="castle-base" aria-hidden="true" />
      </span>
      <span className="castle-blurb">{blurb}</span>
    </Link>
  );
}
