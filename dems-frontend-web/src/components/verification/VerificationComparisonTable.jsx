import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Fingerprint,
  Link2,
  User,
  Hash
} from 'lucide-react';

const ICON_MAP = {
  mongoFileHash: Fingerprint,
  ipfsContentHash: Fingerprint,
  blockchainHash: Fingerprint,
  fileHash: Fingerprint,
  ipfsCID: Link2,
  generatedHash: Fingerprint,
  uploadedBy: User,
  evidenceId: Hash
};

function displayValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

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

  if (!rows.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-sm">
      <div className="border-b border-slate-700/50 bg-slate-900/40 px-6 py-4">
        <h3 className="text-lg font-bold text-white">Integrity comparison</h3>
        <p className="text-sm text-slate-400">MongoDB metadata, recovered IPFS content, and on-chain proofs</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/40 bg-slate-900/30">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-300">Check</th>
              <th className="px-6 py-4 font-semibold text-slate-300">MongoDB</th>
              <th className="px-6 py-4 font-semibold text-slate-300">IPFS</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Blockchain</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const Icon = ICON_MAP[item.field] || Hash;
              const matched = item.matched !== false && item.status !== 'MISMATCH';

              return (
                <tr
                  key={item.field}
                  className="border-b border-slate-800/80 bg-slate-900/20"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-lg bg-slate-800 p-2">
                        <Icon size={16} className="text-slate-400" />
                      </div>
                      <span className="font-medium text-white">{item.label || item.field}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs break-all font-mono text-xs text-slate-300">
                      {displayValue(item.mongodb)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs break-all font-mono text-xs text-slate-300">
                      {displayValue(item.ipfs)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs break-all font-mono text-xs text-slate-300">
                      {displayValue(item.blockchain)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      matched ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'
                    }`}>
                      {matched ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      <span>{matched ? 'MATCH' : 'MISMATCH'}</span>
                    </div>
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
