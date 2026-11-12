'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import Ivy from '@/components/Ivy';
import { useDoorOpening } from '@/hooks/useDoorOpening';

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
          {/* The parapet, built of separate stones: merlons with coping
              caps on a solid band, carried on a row of stepped corbels. */}
          <span className="castle-parapet" aria-hidden="true">
            <span className="castle-parapet-merlons">
              {Array.from({ length: 7 }, (_, i) => (
                <span key={i} className="castle-merlon" />
              ))}
            </span>
            <span className="castle-parapet-band" />
            <span className="castle-corbels">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className="castle-corbel" />
              ))}
            </span>
          </span>
          <span className="castle-archway" aria-hidden="true">
            {/* The rim: a soft highlight along the arch stones' inner edge,
                following the opening's pointed outline. */}
            <span className="castle-opening-rim">
              <span className="castle-opening">
                {children}
                {leaf('left')}
                {leaf('right')}
              </span>
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
