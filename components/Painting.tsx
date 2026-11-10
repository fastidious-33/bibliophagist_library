import Image from 'next/image';
import { PAINTINGS, type Painting as PaintingData, type PaintingSlot } from '@/lib/paintings';

/**
 * A framed painting with a museum label underneath (title, artist, year).
 * An empty slot in lib/paintings.ts renders the bare frame instead, so pages
 * can be laid out before the paintings are chosen.
 */
export default function Painting({
  slot,
  className,
  priority = false,
  sizes = '(max-width: 1080px) 100vw, 1080px',
  decorative = false,
  override,
  showLabel = true,
}: {
  /** False for thumbnails (e.g. genre cards), where a label per card is clutter. */
  showLabel?: boolean;
  slot: PaintingSlot;
  /** A specific painting instead of the slot's (e.g. a genre's own). */
  override?: PaintingData;
  className?: string;
  /** For the first painting on a page (above the fold). */
  priority?: boolean;
  sizes?: string;
  /** Inside a link (e.g. a door card): hidden from screen readers so the
   *  link's name is its own text, not the painting's label. */
  decorative?: boolean;
}) {
  const painting = override ?? PAINTINGS[slot];

  return (
    <figure className={`painting${className ? ` ${className}` : ''}`} aria-hidden={decorative || undefined}>
      <div className={`painting-frame${painting ? '' : ' painting-frame--empty'}`}>
        {painting && (
          <Image
            src={painting.src}
            alt={decorative ? '' : painting.alt}
            width={painting.width}
            height={painting.height}
            sizes={sizes}
            priority={priority}
          />
        )}
      </div>
      {showLabel && (
        <figcaption className="museum-label">
          {painting ? (
            <>
              <cite>{painting.title}</cite>
              <span>
                {painting.artist}, {painting.year}
              </span>
              {painting.sourceUrl && (
                <a href={painting.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Source
                </a>
              )}
            </>
          ) : (
            <span className="museum-label-empty">A painting will hang here.</span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
