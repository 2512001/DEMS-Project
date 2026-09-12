import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getQuarantineById, listQuarantine, reviewQuarantine } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import HashValue from '../../components/HashValue.jsx';
import { formatDate } from '../../utils/format.js';

export default function QuarantineReview() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const list = useQuery({ queryKey: ['quarantine'], queryFn: listQuarantine });
  const detail = useQuery({
    queryKey: ['quarantine', selectedId],
    queryFn: () => getQuarantineById(selectedId),
    enabled: Boolean(selectedId)
  });

  const review = useMutation({
    mutationFn: ({ id, decision }) => reviewQuarantine(id, { decision, reason }),
    onSuccess: () => {
      setReason('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['quarantine'] });
      queryClient.invalidateQueries({ queryKey: ['org-overview'] });
    },
    onError: (err) => setError(err?.response?.data?.message || err.message)
  });

  const confirmDecision = (decision) => {
    if (!reason.trim()) {
      setError('A review reason is required.');
      return;
    }
    const label = decision === 'approved'
      ? 'Approving will move this evidence into trusted encrypted storage.'
      : 'Rejecting will keep this evidence isolated from trusted storage.';
    if (!window.confirm(`${decision === 'approved' ? 'Approve Evidence?' : 'Reject Evidence?'}\n\nThis evidence was flagged by AI.\n${label}`)) {
      return;
    }
    review.mutate({ id: selectedId, decision });
  };

  const record = detail.data?.data;
  const preview = record?.fileContent && record.mimeType?.startsWith('image/')
    ? `data:${record.mimeType};base64,${record.fileContent}`
    : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <div className="section-card">
        <h1 className="mb-4 text-2xl font-extrabold">Quarantine</h1>
        {(list.data?.data || []).map((item) => (
          <button key={item._id} type="button" className="mb-3 w-full rounded-xl border border-slate-800 p-4 text-left hover:border-sky-500/40" onClick={() => setSelectedId(item._id)}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-white">{item.fileName}</span>
              <StatusBadge status={item.reviewStatus} />
            </div>
            <p className="mt-2 text-sm text-slate-400">Case: {item.caseId || 'N/A'} · {formatDate(item.createdAt)}</p>
          </button>
        ))}
        {!list.data?.data?.length ? <p className="text-slate-400">No quarantine records for this organization.</p> : null}
      </div>

      <div className="section-card">
        {!record ? <p className="text-slate-400">Select a quarantine record to review.</p> : (
          <div className="grid gap-4">
            <h2 className="text-xl font-bold">{record.fileName}</h2>
            {preview ? <img src={preview} alt={record.fileName} className="max-h-80 rounded-xl object-contain" /> : null}
            <p className="text-sm text-slate-400">Uploader: {record.UploaderWallet}</p>
            <p className="text-sm text-slate-400">Case: {record.caseId || 'N/A'}</p>
            <div><p className="label">Original hash</p><HashValue value={record.originalFileHash} compact={false} /></div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
              <p>Authenticity: {record.aiAnalysis?.authenticityScore ?? record.aiAnalysis?.score}%</p>
              <p>Tampering: {record.aiAnalysis?.tamperingScore}%</p>
              <p>Deepfake: {record.aiAnalysis?.deepfakeScore}%</p>
              <p className="mt-2">{record.aiAnalysis?.explanation}</p>
            </div>
            {record.adminDecisionReason ? <p className="text-sm text-slate-300">Admin reason: {record.adminDecisionReason}</p> : null}
            {record.reviewStatus === 'pending_review' ? (
              <>
                <textarea className="input min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason" />
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                <div className="flex gap-3">
                  <button type="button" className="btn-primary" onClick={() => confirmDecision('approved')} disabled={review.isPending}>Approve</button>
                  <button type="button" className="btn-secondary" onClick={() => confirmDecision('rejected')} disabled={review.isPending}>Reject</button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
