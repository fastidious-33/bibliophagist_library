import Image from 'next/image';
import Link from 'next/link';
import { PAINTINGS, type PaintingSlot } from '@/lib/paintings';

/**
 * A link card for /browse and the Librarian's rooms. Until its slot has a
 * painting it's a plain tab (title + one line); once one is hung in
 * lib/paintings.ts, the painting fills the card and the title sits on a
 * small paper label pinned near the bottom, like a museum label on the
 * canvas, so text never sits directly on the picture.
 */
export default function PaintedCard({
  href,
  title,
  blurb,
  slot,
}: {
  href: string;
  title: string;
  blurb: string;
  slot: PaintingSlot;
}) {
  const painting = PAINTINGS[slot];

  if (!painting) {
    return (
      <Link href={href} className="tab-card">
        <span className="tab-card-title">{title}</span>
        <span className="tab-card-blurb">{blurb}</span>
      </Link>
    );
  }

  return (
    <Link href={href} className="tab-card tab-card--painted">
      {/* Decorative here: the label names the link; the painting's own
          caption appears on the page it leads to. */}
      <Image
        src={painting.src}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 340px"
        className="tab-card-painting"
      />
      <span className="tab-card-label">
        <span className="tab-card-title">{title}</span>
        <span className="tab-card-blurb">{blurb}</span>
      </span>
    </Link>
  );
}
