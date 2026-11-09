'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePopover } from '@/hooks/usePopover';

export interface FilterOption {
  value: string;
  label: string;
}

/** How long a typed prefix stays live before the buffer resets. */
const TYPEAHEAD_RESET_MS = 900;

interface Row extends FilterOption {
  checked: boolean;
  /** Selected, but no longer offered under the other active filters. */
  orphaned: boolean;
}

export default function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = true,
  typeahead = false,
}: {
  label: string;
  /** Only options that still have results — empty ones are omitted upstream. */
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  /**
   * Type-to-jump, like a native <select> but matching anywhere in the label
   * rather than only the start — so "fan" finds both "Fantasy and Sci-Fi"
   * and "Cozy Fantasy". Every match is highlighted; focus goes to the
   * first. Unlike a native select this shows what you've typed, because
   * contains-matching means longer strings and silent failure is worse.
   */
  typeahead?: boolean;
}) {
  const { open, toggle, ref } = usePopover<HTMLDivElement>();
  const [query, setQuery] = useState('');
  const [buffer, setBuffer] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const staleRef = useRef(false);
  const bufferRef = useRef('');
  const bufferTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panelId = `filter-panel-${label.toLowerCase().replace(/\s+/g, '-')}`;

  // Return focus to the trigger when the panel closes, so a keyboard user
  // isn't dumped back to the top of the document.
  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    staleRef.current = false;
    setBuffer('');
    if (bufferTimer.current) clearTimeout(bufferTimer.current);
  }, []);

  // Start every opening fresh. Done here, in the only handler that opens
  // the panel, rather than in an effect on close: the panel closes three
  // ways (trigger, outside click, Escape), and a closed panel renders
  // neither the search text nor the typeahead, so stale values are unseen.
  function togglePanel() {
    if (!open) {
      setQuery('');
      resetBuffer();
    }
    toggle();
  }

  useEffect(
    () => () => {
      if (bufferTimer.current) clearTimeout(bufferTimer.current);
    },
    []
  );

  /**
   * Checked options pin to the top so selections stay together and can be
   * unticked without hunting. Order within each group is preserved, so the
   * list only rearranges when you actually tick something.
   *
   * Orphans — selected values no longer offered under the other active
   * filters — sit with the other checked rows. They're kept rather than
   * silently dropped: undoing someone's click without telling them is worse
   * than showing a dead end they can undo.
   */
  // Typeahead lists also render the box, shown only on touch devices (see
  // .multiselect-search--touch in globals.css) — typeahead needs a physical
  // keyboard, so touch users would otherwise have no way to search.
  const hasSearchBox = searchable || typeahead;

  const rows: Row[] = useMemo(() => {
    const q = hasSearchBox && query.trim() ? query.trim().toLowerCase() : '';
    const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

    const checked = visible.filter((o) => selected.includes(o.value));
    const unchecked = visible.filter((o) => !selected.includes(o.value));
    const orphans = selected
      .filter((v) => !options.some((o) => o.value === v))
      .filter((v) => !q || v.toLowerCase().includes(q))
      .map((v) => ({ value: v, label: v }));

    return [
      ...checked.map((o) => ({ ...o, checked: true, orphaned: false })),
      ...orphans.map((o) => ({ ...o, checked: true, orphaned: true })),
      ...unchecked.map((o) => ({ ...o, checked: false, orphaned: false })),
    ];
  }, [options, selected, query, hasSearchBox]);

  /** Every row whose label contains the typed buffer. */
  const matches = useMemo(() => {
    if (!buffer) return new Set<string>();
    return new Set(
      rows.filter((r) => r.label.toLowerCase().includes(buffer)).map((r) => r.value)
    );
  }, [buffer, rows]);

  const firstMatch = useMemo(() => rows.find((r) => matches.has(r.value)), [rows, matches]);

  // Focus the first match so Space ticks something sensible, while every
  // match stays highlighted.
  useEffect(() => {
    if (!firstMatch) return;
    const input = optionsRef.current?.querySelector<HTMLInputElement>(
      `input[data-value="${CSS.escape(firstMatch.value)}"]`
    );
    if (!input) return;
    input.focus();
    input.closest('label')?.scrollIntoView({ block: 'nearest' });
  }, [firstMatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!typeahead || !open) return;
      // Keys typed into the search box are for the box, not the typeahead.
      if (e.target instanceof HTMLInputElement && e.target.type === 'search') return;
      // Space belongs to the focused checkbox; modifiers are shortcuts.
      if (e.key.length !== 1 || e.key === ' ' || e.metaKey || e.ctrlKey || e.altKey) return;

      e.preventDefault();
      // After the pause the buffer is "stale": the next keystroke starts a
      // new word rather than continuing the old one. The timer only sets
      // this flag — it no longer clears the display, so highlights stay put
      // until you type again or close the panel.
      const next = staleRef.current ? e.key.toLowerCase() : bufferRef.current + e.key.toLowerCase();
      staleRef.current = false;
      bufferRef.current = next;
      setBuffer(next);

      if (bufferTimer.current) clearTimeout(bufferTimer.current);
      bufferTimer.current = setTimeout(() => {
        staleRef.current = true;
      }, TYPEAHEAD_RESET_MS);
    },
    [typeahead, open]
  );

  function toggleValue(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const triggerLabel =
    selected.length === 0 ? `All ${label}` : `${label}: ${selected.length} selected`;

  return (
    // Listener on the root, not the panel: with no search input the trigger
    // keeps focus when the panel opens, so keystrokes would never reach a
    // handler bound further in.
    <div className="multiselect" ref={ref} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={`multiselect-trigger${selected.length > 0 ? ' has-selection' : ''}`}
        onClick={togglePanel}
        // Not aria-haspopup="listbox": the panel holds checkboxes, and a
        // listbox's children must be options.
        aria-expanded={open}
        aria-controls={panelId}
      >
        {triggerLabel}
      </button>

      {open && (
        <div className="multiselect-panel" id={panelId}>
          {hasSearchBox && (
            <input
              type="search"
              className={`multiselect-search${searchable ? '' : ' multiselect-search--touch'}`}
              placeholder={`Search ${label.toLowerCase()}…`}
              aria-label={`Search ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Not for the touch-only box: focusing it would raise the
              // on-screen keyboard over the list the moment the panel opens.
              autoFocus={searchable}
            />
          )}

          {/* The hint says typeahead exists; while typing, the strip below
              takes its place. Hidden on touch, where the box does the job. */}
          {typeahead && !buffer && (
            <div className="multiselect-hint">Type to jump</div>
          )}

          {/* Appears only while typing and clears with the buffer, so it
              costs no height at rest. */}
          {buffer && (
            <div
              className={`multiselect-typeahead${firstMatch ? '' : ' is-nomatch'}`}
              aria-live="polite"
            >
              {firstMatch
                ? `${buffer} → ${firstMatch.label}${
                    matches.size > 1 ? ` +${matches.size - 1} more` : ''
                  }`
                : `${buffer} — no match`}
            </div>
          )}

          {/* <div role="group"> rather than <fieldset>: fieldsets have their
              own intrinsic sizing and wouldn't stay inside the flex panel,
              so long lists spilled past it instead of scrolling. */}
          <div className="multiselect-options" role="group" aria-label={label} ref={optionsRef}>
            {rows.length === 0 ? (
              <div className="multiselect-empty">No matches</div>
            ) : (
              rows.map((row) => (
                <label
                  className={[
                    'multiselect-option',
                    row.orphaned ? 'is-orphaned' : '',
                    matches.has(row.value) ? 'is-typeahead-match' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  key={row.value}
                >
                  <input
                    type="checkbox"
                    data-value={row.value}
                    checked={row.checked}
                    onChange={() => toggleValue(row.value)}
                  />
                  <span className="multiselect-option-label">
                    {row.label}
                    {row.orphaned && <span className="multiselect-orphan-note"> (no matches)</span>}
                  </span>
                </label>
              ))
            )}
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              className="clear-filters-btn multiselect-clear"
              onClick={() => onChange([])}
            >
              Clear {label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
