import React, { useState } from 'react';
import { Copy, CheckCircle2, Fingerprint } from 'lucide-react';
import { compactHash } from '../utils/format.js';

export default function HashValue({ value, label = 'Copy value', compact = true }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(String(value || ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!value) {
    return (
      <span className="inline-flex items-center gap-2 text-slate-500">
        <Fingerprint size={14} />
        <span className="text-sm">pending</span>
      </span>
    );
  }

  return (
    <div className="group inline-flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5 border border-slate-700/50 transition-all duration-300 hover:border-slate-600/50 hover:bg-slate-700/50">
        <Fingerprint size={14} className="text-slate-500" />
        <code className="break-anywhere text-sm font-mono text-sky-300">
          {compact ? compactHash(value) : value}
        </code>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center justify-center rounded-lg bg-slate-700/50 p-1.5 transition-all hover:bg-slate-600/50 hover:scale-105"
        title={label}
      >
        {copied ? (
          <CheckCircle2 size={14} className="text-emerald-400" />
        ) : (
          <Copy size={14} className="text-slate-400 group-hover:text-slate-300" />
        )}
      </button>
    </div>
  );
}
