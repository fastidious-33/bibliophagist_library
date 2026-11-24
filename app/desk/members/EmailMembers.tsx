'use client';

import { useState } from 'react';

/**
 * "Email all members" on /desk/members: opens your mail app addressed to
 * you, with every member (approved, active, paused) in BCC, so nobody sees
 * anyone else's address. Some mail apps cut very long links, so "Copy all
 * emails" is there to paste into BCC by hand.
 */
export default function EmailMembers({ to, emails }: { to: string; emails: string[] }) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');

  if (emails.length === 0) return null;

  const mailto = `mailto:${encodeURIComponent(to)}?bcc=${emails.map(encodeURIComponent).join(',')}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <div className="desk-email">
      <a href={mailto} className="btn btn-secondary">
        Email all {emails.length} {emails.length === 1 ? 'member' : 'members'}
      </a>
      <button type="button" className="text-button" onClick={copy}>
        Copy all emails
      </button>
      {copied === 'copied' && (
        <span className="desk-done" role="status">
          Copied. Paste them into BCC.
        </span>
      )}
      {copied === 'failed' && (
        <span className="member-error" role="alert">
          Couldn&rsquo;t copy. Your browser blocked it.
        </span>
      )}
    </div>
  );
}
