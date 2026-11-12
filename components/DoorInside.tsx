import Image from 'next/image';
import { PAINTINGS, type PaintingSlot } from '@/lib/paintings';

/**
 * What's behind a home page door: the slot's picture (lib/paintings.ts)
 * filling the opening, under a warm lamp-light and a dark vignette. With
 * the slot empty it is just the light in the dark, so a door never opens
 * onto nothing. Decorative: the door's nameplate names the link, and the
 * picture is credited on the page it belongs to.
 */
export default function DoorInside({ slot, sizes }: { slot: PaintingSlot; sizes: string }) {
  const painting = PAINTINGS[slot];
  return (
    <span className="door-inside">
      {painting && <Image src={painting.src} alt="" fill sizes={sizes} className="door-inside-picture" />}
      <span className="door-inside-light" />
    </span>
  );
}
