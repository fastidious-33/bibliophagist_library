'use client';

import { useState } from 'react';

/**
 * A button that copies some text (the UPI ID) and says so. The text itself
 * is always shown beside it by the caller, for browsers that block copying.
 */
export default function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => undefined);
  }

  return (
    <button type="button" className="btn btn-primary" onClick={copy}>
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}
