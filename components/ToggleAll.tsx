'use client';

import { useEffect, useState } from 'react';

/**
 * "Open all" / "Close all" for every <details> inside the element with id
 * `target`. Reads "Close all" only once every one is open, and keeps up as
 * lists are opened or closed one by one. Without JavaScript the lists still
 * open individually.
 */
export default function ToggleAll({ target }: { target: string }) {
  const [allOpen, setAllOpen] = useState(false);

  const lists = () => Array.from(document.getElementById(target)?.querySelectorAll('details') ?? []);

  useEffect(() => {
    const container = document.getElementById(target);
    if (!container) return;
    const sync = () => {
      const all = Array.from(container.querySelectorAll('details'));
      setAllOpen(all.length > 0 && all.every((d) => d.open));
    };
    sync();
    // 'toggle' doesn't bubble, so listen while it travels down.
    container.addEventListener('toggle', sync, true);
    return () => container.removeEventListener('toggle', sync, true);
  }, [target]);

  return (
    <button
      type="button"
      className="read-link toggle-all"
      aria-controls={target}
      onClick={() => {
        const open = !allOpen;
        lists().forEach((d) => {
          d.open = open;
        });
      }}
    >
      {allOpen ? 'Close all' : 'Open all'}
    </button>
  );
}
