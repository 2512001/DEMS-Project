import React from 'react';

const STATUS_STYLES = {
  VERIFIED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  TAMPERED: 'border-red-400/40 bg-red-400/10 text-red-300',
  PENDING: 'border-amber-400/40 bg-amber-400/10 text-amber-300'
};

export default function VerificationStatusBadge({ status = 'PENDING' }) {
  const normalized = String(status || 'PENDING').toUpperCase();
  const tone = STATUS_STYLES[normalized] || STATUS_STYLES.PENDING;

  return (
    <span className={`status-pill ${tone}`}>
      {normalized.replaceAll('_', ' ')}
    </span>
  );
}
