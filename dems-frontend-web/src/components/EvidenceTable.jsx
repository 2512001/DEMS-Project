import React from 'react';
import { Link } from 'react-router-dom';
import { Archive } from 'lucide-react';
import HashValue from './HashValue.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDate } from '../utils/format.js';

export default function EvidenceTable({ files = [], detailsBase = '/citizen/evidence' }) {
  if (!files.length) {
    return (
      <div className="grid min-h-56 place-items-center border border-dashed border-slate-700 text-slate-400">
        <div className="text-center">
          <Archive className="mx-auto mb-2" size={24} />
          No evidence records found.
        </div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="min-w-[980px] w-full border-collapse text-sm">
        <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
          <tr>
            <th className="p-3">File</th>
            <th className="p-3">Case</th>
            <th className="p-3">Status</th>
            <th className="p-3">Hash</th>
            <th className="p-3">IPFS CID</th>
            <th className="p-3">AI</th>
            <th className="p-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file._id} className="border-t border-slate-800">
              <td className="p-3">
                <Link className="text-sky-200 hover:text-emerald-200" to={`${detailsBase}/${file._id}`}>{file.fileName}</Link>
              </td>
              <td className="p-3">{file.caseId || 'personal'}</td>
              <td className="p-3"><StatusBadge status={file.status} /></td>
              <td className="p-3"><HashValue value={file.fileHash} /></td>
              <td className="p-3"><HashValue value={file.ipfsCID} /></td>
              <td className="p-3">{file.aiAnalysis?.score ?? 0}%</td>
              <td className="p-3 text-slate-400">{formatDate(file.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
