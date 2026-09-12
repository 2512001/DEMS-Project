import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listQuarantine } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

export default function PendingReviews() {
  const { data } = useQuery({ queryKey: ['quarantine'], queryFn: listQuarantine });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Pending Reviews</h1>
      {(data?.data || []).map((item) => (
        <div className="section-card" key={item._id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">{item.fileName}</p>
              <p className="text-sm text-slate-400">Case: {item.caseId || 'N/A'} · {formatDate(item.createdAt)}</p>
          {item.reviewStatus === 'rejected' ? <p className="mt-2 text-sm text-red-300">Admin reason: {item.adminDecisionReason}</p> : null}
              {item.reviewStatus === 'approved' && item.resultingEvidenceId ? (
                <a className="mt-2 inline-block text-sm text-sky-300" href={`/citizen/evidence/${item.resultingEvidenceId}`}>Open trusted evidence</a>
              ) : null}
            </div>
            <StatusBadge status={item.reviewStatus} />
          </div>
        </div>
      ))}
      {!data?.data?.length ? <div className="section-card text-slate-400">No quarantine submissions.</div> : null}
    </div>
  );
}
