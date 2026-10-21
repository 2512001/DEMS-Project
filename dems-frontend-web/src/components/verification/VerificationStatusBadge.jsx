import React, { useState } from 'react';
import { Check, CheckCircle2, Copy, ExternalLink } from 'lucide-react';
import { formatDate } from '../../utils/format.js';

function explorerBase() {
  const chainId = Number(import.meta.env.VITE_REQUIRED_CHAIN_ID || 31337);
  if (chainId === 11155111) return 'https://sepolia.etherscan.io';
  if (chainId === 1) return 'https://etherscan.io';
  return null;
}

export default function VerificationStatusBadge({ status = 'PENDING' }) {
  const normalized = String(status || 'PENDING').toUpperCase();
  const config =
    normalized === 'VERIFIED'
      ? 'border-[#c7e9dd] bg-success-soft text-success'
      : normalized === 'TAMPERED'
        ? 'border-[#f4caca] bg-danger-soft text-danger'
        : 'border-[#f0dfbd] bg-warn-soft text-warn';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5 ${config}`}>
      {normalized.replaceAll('_', ' ')}
    </span>
  );
}

export function VerificationBanner({ verified, message, verifiedAt, transactionHash }) {
  const [copied, setCopied] = useState(false);
  const explorer = explorerBase();

  const copy = () => {
    navigator.clipboard.writeText(transactionHash || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      className={`flex flex-col gap-4 rounded-card border p-5 sm:flex-row sm:items-center sm:justify-between ${
        verified ? 'border-[#c7e9dd] bg-success-soft' : 'border-[#f4caca] bg-danger-soft'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] ${
            verified ? 'bg-card text-success' : 'bg-card text-danger'
          }`}
        >
          {verified ? <CheckCircle2 size={20} /> : <ExternalLink size={18} />}
        </span>
        <div>
          <p className={`text-[15px] font-semibold ${verified ? 'text-[#106b53]' : 'text-[#a82f2f]'}`}>
            {verified ? 'Integrity verified' : 'Integrity check failed'}
          </p>
          <p className={`mt-0.5 text-[13px] leading-5 ${verified ? 'text-[#2c7a65]' : 'text-[#a82f2f]'}`}>
            {message || (verified
              ? 'Stored metadata, IPFS content and the blockchain proof match.'
              : 'A mismatch was detected between the file and its recorded proof.')}
          </p>
          {verifiedAt ? (
            <p className="mt-1 text-[11.5px] text-ink-faint">Checked {formatDate(verifiedAt)}</p>
          ) : null}
        </div>
      </div>

      {transactionHash ? (
        <div className="flex items-center gap-1.5">
          <code className="rounded-[7px] border border-line bg-card px-2 py-1 font-mono text-[11.5px] text-ink-muted">
            {transactionHash.slice(0, 10)}…{transactionHash.slice(-8)}
          </code>
          <button
            type="button"
            onClick={copy}
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-line bg-card text-ink-faint transition hover:text-ink"
            aria-label="Copy transaction hash"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
          </button>
          {explorer ? (
            <a
              href={`${explorer}/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="grid h-7 w-7 place-items-center rounded-[7px] border border-line bg-card text-ink-faint transition hover:text-ink"
              aria-label="View transaction on explorer"
            >
              <ExternalLink size={12} />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
