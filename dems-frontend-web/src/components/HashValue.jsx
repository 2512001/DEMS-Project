import React from 'react';
import { Copy } from 'lucide-react';
import { compactHash } from '../utils/format.js';

export default function HashValue({ value, label = 'Copy value', compact = true }) {
  const copy = () => navigator.clipboard?.writeText(String(value || ''));
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <code className="break-anywhere text-sky-200">{compact ? compactHash(value) : value || 'pending'}</code>
      {value ? (
        <button type="button" className="icon-btn h-7 w-7 shrink-0" onClick={copy} title={label}>
          <Copy size={13} />
        </button>
      ) : null}
    </span>
  );
}
