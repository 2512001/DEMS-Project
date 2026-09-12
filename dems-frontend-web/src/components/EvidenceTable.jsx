import React from 'react';
import { Link } from 'react-router-dom';
import { Archive, FileText, Link2, Fingerprint, Brain, Calendar, ExternalLink } from 'lucide-react';
import HashValue from './HashValue.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDate } from '../utils/format.js';

export default function EvidenceTable({ files = [], detailsBase = '/citizen/evidence' }) {
  if (!files.length) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-dashed border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-12 backdrop-blur-sm">
        <div className="text-center">
          <div className="flex items-center justify-center rounded-2xl bg-slate-800/50 p-4 w-fit mx-auto mb-4">
            <Archive size={48} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Evidence Records Found</h3>
          <p className="text-sm text-slate-400">Upload your first evidence to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-900/50">
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <FileText size={14} />
                File Name
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Case ID
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Review
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Storage
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Blockchain
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <Fingerprint size={14} />
                Hash
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <Link2 size={14} />
                IPFS CID
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <Brain size={14} />
                AI Score
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                Created
              </div>
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const detailsTo = file.isQuarantine ? '/officer/pending-reviews' : `${detailsBase}/${file._id}`;
            return (
            <tr
              key={file._id}
              className="group border-b border-slate-800/50 bg-slate-800/20 transition-all duration-200 hover:bg-slate-700/30 hover:shadow-lg"
            >
              <td className="px-6 py-4">
                <Link
                  to={detailsTo}
                  className="group/link inline-flex items-center gap-2 font-medium text-sky-300 transition-colors hover:text-sky-200"
                >
                  <span className="truncate max-w-[200px]">{file.fileName}</span>
                  <ExternalLink size={14} className="opacity-0 transition-opacity group-hover/link:opacity-100" />
                </Link>
              </td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center rounded-lg bg-slate-700/50 px-3 py-1.5 text-sm text-slate-300">
                  {file.caseId || 'Personal'}
                </span>
              </td>
              <td className="px-6 py-4">
                <StatusBadge status={file.status} />
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-slate-300">{file.reviewStatus || (file.isQuarantine ? file.status : 'not_required')}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-slate-300">{file.storageStatus || (file.ipfsCID ? 'ipfs' : 'not_stored')}</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-sm text-slate-300">{file.blockchainStatus || (file.blockchainTxHash ? 'confirmed' : 'not_requested')}</span>
              </td>
              <td className="px-6 py-4">
                <HashValue value={file.fileHash} compact />
              </td>
              <td className="px-6 py-4">
                <HashValue value={file.ipfsCID} compact />
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    (file.aiAnalysis?.score ?? 0) >= 90 ? 'bg-emerald-400' :
                    (file.aiAnalysis?.score ?? 0) >= 70 ? 'bg-amber-400' :
                    'bg-red-400'
                  }`} />
                  <span className="text-sm font-medium text-white">
                    {file.aiAnalysis?.requested === false ? 'Not requested' : `${file.aiAnalysis?.authenticityScore ?? file.aiAnalysis?.score ?? 0}%`}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-400">
                {formatDate(file.createdAt)}
              </td>
              <td className="px-6 py-4">
                {file.isQuarantine ? (
                  <Link
                    to="/officer/pending-reviews"
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200"
                  >
                    Review status
                    <ExternalLink size={14} />
                  </Link>
                ) : (
                  <Link
                    to={`${detailsBase}/${file._id}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 hover:shadow-lg hover:shadow-sky-500/20"
                  >
                    View Details
                    <ExternalLink size={14} />
                  </Link>
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
