import React from 'react';

function MatchIndicator({ matched, label }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-slate-800 bg-black/20 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span
        className={`text-sm font-semibold ${
          matched ? 'text-emerald-300' : 'text-red-300'
        }`}
      >
        {matched ? 'Matched' : 'Mismatch'}
      </span>
    </div>
  );
}

export default function VerificationComparisonTable({ mismatches = [] }) {
  if (!mismatches.length) {
    return null;
  }

  return (
    <div className="table-wrap mt-4">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-800 bg-black/30">
          <tr>
            <th className="px-4 py-3 font-semibold text-slate-300">Field</th>
            <th className="px-4 py-3 font-semibold text-slate-300">Expected</th>
            <th className="px-4 py-3 font-semibold text-slate-300">Actual</th>
          </tr>
        </thead>
        <tbody>
          {mismatches.map((item) => (
            <tr key={item.field} className="border-b border-slate-800/80">
              <td className="px-4 py-3 font-medium capitalize text-white">
                {item.field}
              </td>
              <td className="px-4 py-3 break-all font-mono text-xs text-emerald-200">
                {item.expected || 'N/A'}
              </td>
              <td className="px-4 py-3 break-all font-mono text-xs text-red-200">
                {item.actual || 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { MatchIndicator };
