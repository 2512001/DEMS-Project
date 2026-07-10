import React from 'react';
export default function StatusBadge({ status = 'pending' }) {
  const tone = {
    encrypted: 'text-sky-300 border-sky-400/40',
    pending_blockchain: 'text-amber-300 border-amber-400/40',
    stored_on_chain: 'text-emerald-300 border-emerald-400/40',
    pending: 'text-amber-300 border-amber-400/40',
    approved: 'text-emerald-300 border-emerald-400/40',
    rejected: 'text-red-300 border-red-400/40',
    error: 'text-red-300 border-red-400/40'
  }[status] || 'text-slate-300 border-slate-700';

  return <span className={`status-pill ${tone}`}>{String(status).replaceAll('_', ' ')}</span>;
}
