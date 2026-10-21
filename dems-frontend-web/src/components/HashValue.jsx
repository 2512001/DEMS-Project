import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { compactHash } from '../utils/format.js';

/**
 * Renders a technical identifier (hash, CID, wallet) quietly, with a copy
 * affordance. Long values are truncated but remain selectable in full via the
 * title attribute and the optional `expandable` toggle.
 */
export default function HashValue({
  value,
  label = 'Copy value',
  compact = true,
  mono = true,
  icon: Icon,
  className = ''
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard?.writeText(String(value));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (!value) {
    return <span className="text-[13px] text-ink-faint">—</span>;
  }

  const text = String(value);
  const canExpand = text.length > 28;

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 ${className}`}>
      {Icon ? <Icon size={13} className="shrink-0 text-ink-faint" aria-hidden="true" /> : null}
      <span
        className={`break-anywhere ${mono ? 'font-mono text-[12px]' : 'text-[13px]'} ${compact && !expanded ? 'whitespace-nowrap' : ''} text-ink-muted`}
        title={text}
      >
        {compact && !expanded ? compactHash(text) : text}
      </span>
      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="shrink-0 rounded px-1 text-[11px] font-medium text-ink-faint transition hover:text-brand"
          aria-expanded={expanded}
        >
          {expanded ? 'less' : 'more'}
        </button>
      ) : null}
      <button
        type="button"
        onClick={handleCopy}
        className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint transition hover:bg-surface hover:text-ink"
        title={label}
        aria-label={label}
      >
        {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      </button>
    </span>
  );
}
