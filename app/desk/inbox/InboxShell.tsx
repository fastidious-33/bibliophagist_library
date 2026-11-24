'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import type { InboxKind } from '@/lib/desk-inbox';
import {
  acceptRequestsAction,
  approveSignUpsAction,
  declineRequestsAction,
  declineSignUpsAction,
} from '../actions';
import type { DeskResult } from '../DeskForm';

/** One row of the list: everything it shows, worked out on the server. */
export interface InboxRow {
  key: string;
  kind: InboxKind;
  /** "Sign-up", "Overdue", … */
  label: string;
  who: string;
  what: string;
  /** "3d", or "4d late" for overdue books. */
  when: string;
  urgent: boolean;
  /** Rows that can be ticked and acted on together: sign-ups and requests. */
  tick?: { name: 'memberId' | 'requestId'; ids: string[] };
}

/**
 * Told by an action button that it worked: the stamp to show, and whether
 * to move on to the next item (most actions resolve their item; marking
 * one of two payments doesn't).
 */
export const InboxContext = createContext<{ done: (stamp: string, advance: boolean) => void }>({
  done: () => {},
});

interface Props {
  rows: InboxRow[];
  /** The item shown in the detail pane. */
  selected: string | null;
  /** The filter chip in use ('' for All). */
  type: string;
  /** An item is open in the address: on a phone, the detail takes the screen. */
  open: boolean;
  /** The selected item's index card (server-rendered). */
  children: ReactNode;
}

/**
 * The inbox's list and detail (PLAN.md "Account and desk rework", B3c).
 * Side by side on a laptop; on a phone the list, or the open item full
 * screen. Holds what lives in the browser: ticked rows and their bulk
 * bar, the keys (j/k move, a accept, d decline, e extend), and the
 * rubber stamp that lands on an item when it's done before the next one
 * slides in. An action that fails leaves the item where it is, with its
 * error.
 */
export default function InboxShell({ rows, selected, type, open, children }: Props) {
  const router = useRouter();
  const detailRef = useRef<HTMLDivElement>(null);
  const [stamp, setStamp] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(() => new Set());
  const [bulkPending, startBulk] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const href = useCallback(
    (key: string | null) => {
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (key) params.set('item', key);
      const query = params.toString();
      return query ? `/desk?${query}` : '/desk';
    },
    [type],
  );

  const go = useCallback((key: string | null) => router.replace(href(key), { scroll: false }), [router, href]);

  const done = useCallback(
    (label: string, advance: boolean) => {
      const index = rows.findIndex((row) => row.key === selected);
      const next = rows[index + 1]?.key ?? rows[index - 1]?.key ?? null;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setStamp(label);
      window.setTimeout(
        () => {
          setStamp(null);
          if (advance) go(next);
        },
        reduced ? 400 : 750,
      );
    },
    [rows, selected, go],
  );

  // Keys, on a laptop: never while typing, or with Ctrl/Cmd/Alt held.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'j' || event.key === 'k') {
        const index = rows.findIndex((row) => row.key === selected);
        const next = event.key === 'j' ? rows[index + 1] : rows[index - 1];
        if (next) {
          event.preventDefault();
          go(next.key);
        }
        return;
      }
      if (event.key === 'a' || event.key === 'd' || event.key === 'e') {
        const control = detailRef.current?.querySelector<HTMLElement>(`[data-shortcut="${event.key}"]`);
        if (!control) return;
        event.preventDefault();
        // e only moves to the extend choices; picking one is a second key (Enter).
        if (event.key === 'e') control.focus();
        else control.click();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, selected, go]);

  // Only rows still in the inbox count as ticked.
  const tickedRows = useMemo(() => rows.filter((row) => row.tick && ticked.has(row.key)), [rows, ticked]);
  const tickedSignUps = tickedRows.filter((row) => row.kind === 'signup');
  const tickedRequests = tickedRows.filter((row) => row.kind === 'requests');
  const requestCount = tickedRequests.reduce((sum, row) => sum + (row.tick?.ids.length ?? 0), 0);

  function toggle(key: string) {
    setTicked((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function bulk(
    action: (previous: DeskResult, form: FormData) => Promise<DeskResult>,
    picked: InboxRow[],
    label: string,
    confirmText?: string,
  ) {
    if (confirmText && !window.confirm(confirmText)) return;
    const form = new FormData();
    for (const row of picked) for (const id of row.tick?.ids ?? []) form.append(row.tick!.name, id);
    setBulkError(null);
    startBulk(async () => {
      try {
        const result = await action({}, form);
        if (result.error) {
          setBulkError(result.error);
          return;
        }
        setTicked(new Set());
        setStamp(label);
        window.setTimeout(() => setStamp(null), 750);
      } catch {
        setBulkError('That didn’t work. Reload the desk and try again.');
      }
    });
  }

  return (
    <InboxContext.Provider value={{ done }}>
      <div className={`inbox${open ? ' is-open' : ''}`}>
        <div className="inbox-list-pane">
          {tickedRows.length > 0 && (
            <div className="inbox-bulk" role="region" aria-label="Ticked items">
              <span className="inbox-bulk-count">{tickedRows.length} ticked</span>
              {tickedSignUps.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={bulkPending}
                    onClick={() => bulk(approveSignUpsAction, tickedSignUps, 'Approved')}
                  >
                    Approve {tickedSignUps.length}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={bulkPending}
                    onClick={() =>
                      bulk(
                        declineSignUpsAction,
                        tickedSignUps,
                        'Declined',
                        `Decline ${tickedSignUps.length} sign-ups, with no note?`,
                      )
                    }
                  >
                    Decline {tickedSignUps.length}
                  </button>
                </>
              )}
              {tickedRequests.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={bulkPending}
                    onClick={() => bulk(acceptRequestsAction, tickedRequests, 'Accepted')}
                  >
                    Accept {requestCount} {requestCount === 1 ? 'request' : 'requests'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={bulkPending}
                    onClick={() =>
                      bulk(
                        declineRequestsAction,
                        tickedRequests,
                        'Declined',
                        `Decline ${requestCount} ${requestCount === 1 ? 'request' : 'requests'}, with no note?`,
                      )
                    }
                  >
                    Decline {requestCount}
                  </button>
                </>
              )}
              <button type="button" className="text-button" onClick={() => setTicked(new Set())}>
                Clear
              </button>
              {bulkError && (
                <p className="member-error" role="alert">
                  {bulkError}
                </p>
              )}
            </div>
          )}

          <ul className="inbox-list">
            {rows.map((row) => (
              <li
                key={row.key}
                className={`inbox-row${row.key === selected ? ' is-selected' : ''}${row.urgent ? ' is-urgent' : ''}`}
              >
                {row.tick ? (
                  <input
                    type="checkbox"
                    className="inbox-tick"
                    aria-label={`Tick ${row.label.toLowerCase()} from ${row.who}`}
                    checked={ticked.has(row.key)}
                    onChange={() => toggle(row.key)}
                  />
                ) : (
                  <span className="inbox-tick" aria-hidden="true" />
                )}
                <Link
                  href={href(row.key)}
                  scroll={false}
                  className="inbox-row-link"
                  aria-current={row.key === selected ? 'true' : undefined}
                >
                  <span className="inbox-row-kind">{row.label}</span>
                  <span className="inbox-row-who">{row.who}</span>
                  <span className="inbox-row-what">{row.what}</span>
                  <span className="inbox-row-when">{row.when}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="inbox-keys" aria-hidden="true">
            <kbd>j</kbd> <kbd>k</kbd> move · <kbd>a</kbd> accept · <kbd>d</kbd> decline · <kbd>e</kbd> extend
          </p>
        </div>

        <div className="inbox-detail-pane" ref={detailRef}>
          <Link href={href(null)} scroll={false} className="inbox-back">
            ← Inbox
          </Link>
          {children}
          {stamp && (
            <div className="inbox-stamp-cover" role="status">
              <span className="inbox-stamp">{stamp}</span>
            </div>
          )}
        </div>
      </div>
    </InboxContext.Provider>
  );
}
