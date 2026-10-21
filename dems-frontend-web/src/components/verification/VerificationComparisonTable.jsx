import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

export default function VerificationComparisonTable({ checks = [], mismatches = [] }) {
  const rows = checks.length
    ? checks
    : mismatches.map((item) => ({
        field: item.field,
        label: item.field,
        mongodb: item.actual,
        blockchain: item.expected,
        matched: false,
        status: 'MISMATCH'
      }));

  if (!rows.length) return null;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[13.5px] font-semibold text-ink">Integrity comparison</h3>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          Stored metadata, recovered IPFS content, and on-chain proofs
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">Check</th>
              <th scope="col">Stored record</th>
              <th scope="col">IPFS</th>
              <th scope="col">Blockchain</th>
              <th scope="col">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const matched = item.matched !== false && item.status !== 'MISMATCH';
              return (
                <tr key={item.field}>
                  <td className="font-medium capitalize text-ink">
                    {String(item.label || item.field).replaceAll(/([A-Z])/g, ' $1')}
                  </td>
                  <td><span className="break-anywhere font-mono text-[11.5px] text-ink-muted">{displayValue(item.mongodb)}</span></td>
                  <td><span className="break-anywhere font-mono text-[11.5px] text-ink-muted">{displayValue(item.ipfs)}</span></td>
                  <td><span className="break-anywhere font-mono text-[11.5px] text-ink-muted">{displayValue(item.blockchain)}</span></td>
                  <td>
                    <span className={matched ? 'badge-success' : 'badge-danger'}>
                      {matched ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {matched ? 'Match' : 'Mismatch'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
