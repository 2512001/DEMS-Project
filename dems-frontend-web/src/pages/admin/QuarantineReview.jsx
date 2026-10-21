import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { getQuarantineById, listQuarantine, reviewQuarantine } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import HashValue from '../../components/HashValue.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import FileTypeIcon from '../../components/ui/FileTypeIcon.jsx';
import { formatBytes, formatDate, formatRelativeTime } from '../../utils/format.js';
import { useToast } from '../../components/ui/Toast.jsx';

export default function QuarantineReview() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [selectedId, setSelectedId] = useState('');
  const [pendingDecision, setPendingDecision] = useState('');
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
      setPendingDecision('');
      queryClient.invalidateQueries({ queryKey: ['quarantine'] });
      queryClient.invalidateQueries({ queryKey: ['org-overview'] });
      push('Review recorded.', { tone: 'success' });
    },
    onError: (err) => setError(err?.response?.data?.message || err.message)
  });

  const requestDecision = (decision) => {
    if (!reason.trim()) {
      setError('A review reason is required.');
      return;
    }
    setError('');
    setPendingDecision(decision);
  };

  const confirmDecision = () => {
    review.mutate({ id: selectedId, decision: pendingDecision });
  };

  const records = list.data?.data || [];
  const record = detail.data?.data;
  const preview = record?.fileContent && record.mimeType?.startsWith('image/')
    ? `data:${record.mimeType};base64,${record.fileContent}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Quarantine review"
        subtitle="Files flagged by AI screening stay isolated until an administrator decides."
        meta={<span className="badge-warn"><ShieldAlert size={11} /> {records.length} record{records.length === 1 ? '' : 's'}</span>}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="panel overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Queue</h2>
              <p className="section-subtitle">Select a record to review</p>
            </div>
          </div>

          {list.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[10px] border border-line p-3.5">
                  <span className="skeleton block h-3.5 w-1/2" />
                  <span className="skeleton mt-2 block h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : list.isError ? (
            <div className="p-4">
              <div className="alert-danger">Quarantine records could not be loaded.</div>
            </div>
          ) : records.length === 0 ? (
            <div className="p-4">
              <EmptyState
                compact
                icon={CheckCircle2}
                title="Nothing in quarantine"
                description="No files are currently held for review in your organization."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {records.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item._id)}
                    className={`w-full px-4 py-3.5 text-left transition hover:bg-surface ${
                      selectedId === item._id ? 'bg-brand-soft/50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileTypeIcon mimeType={item.mimeType} fileName={item.fileName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{item.fileName}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-faint">
                          {item.caseId ? `Case ${item.caseId}` : 'No case'} · {formatRelativeTime(item.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={item.reviewStatus} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-card">
          {!selectedId ? (
            <EmptyState
              compact
              icon={ShieldAlert}
              title="Select a record"
              description="Choose a quarantined file to inspect its AI assessment and decide whether to release or reject it."
            />
          ) : detail.isLoading ? (
            <div className="space-y-3">
              <span className="skeleton block h-5 w-1/2" />
              <span className="skeleton block h-40 w-full rounded-[10px]" />
              <span className="skeleton block h-3 w-full" />
            </div>
          ) : !record ? (
            <div className="alert-danger">This record could not be loaded.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">{record.fileName}</h2>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {formatBytes(record.fileSize)} · {record.mimeType} · {formatDate(record.createdAt)}
                  </p>
                </div>
                <StatusBadge status={record.reviewStatus} />
              </div>

              {preview ? (
                <img src={preview} alt={record.fileName} className="max-h-72 w-full rounded-[10px] border border-line object-contain" />
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="detail-label">Uploader</p>
                  <div className="mt-1"><HashValue value={record.UploaderWallet} compact /></div>
                </div>
                <div>
                  <p className="detail-label">Case</p>
                  <p className="detail-value">{record.caseId || 'N/A'}</p>
                </div>
              </div>

              <div>
                <p className="detail-label">Original hash</p>
                <div className="mt-1"><HashValue value={record.originalFileHash} compact={false} /></div>
              </div>

              <div className="rounded-[10px] border border-[#f0dfbd] bg-warn-soft p-3.5">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-warn">
                  <AlertTriangle size={13} />
                  AI screening result
                </p>
                <dl className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    ['Authenticity', record.aiAnalysis?.authenticityScore ?? record.aiAnalysis?.score],
                    ['Tampering', record.aiAnalysis?.tamperingScore],
                    ['Deepfake', record.aiAnalysis?.deepfakeScore]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[8px] bg-card/70 px-2 py-1.5">
                      <dt className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</dt>
                      <dd className="text-[14px] font-semibold text-ink">{value != null ? `${value}%` : '—'}</dd>
                    </div>
                  ))}
                </dl>
                {record.aiAnalysis?.explanation ? (
                  <p className="mt-2 text-[12px] leading-5 text-[#8a5a12]">{record.aiAnalysis.explanation}</p>
                ) : null}
              </div>

              {record.adminDecisionReason ? (
                <div className="alert-info">
                  <span>Previous decision: {record.adminDecisionReason}</span>
                </div>
              ) : null}

              {record.reviewStatus === 'pending_review' ? (
                <div className="border-t border-line pt-4">
                  <label className="block">
                    <span className="label">Review reason <span className="font-normal text-ink-faint">(required)</span></span>
                    <textarea
                      className="textarea min-h-[84px]"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Explain the decision. This is recorded in the audit log."
                    />
                  </label>
                  {error ? <p className="mt-2 text-[12.5px] text-danger">{error}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => requestDecision('approved')}
                      disabled={review.isPending}
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-danger"
                      onClick={() => requestDecision('rejected')}
                      disabled={review.isPending}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={Boolean(pendingDecision)}
        onClose={() => setPendingDecision('')}
        title={pendingDecision === 'approved' ? 'Approve this file?' : 'Reject this file?'}
        description={
          pendingDecision === 'approved'
            ? 'The file moves into trusted encrypted storage and becomes verifiable.'
            : 'The file stays isolated from trusted storage. This decision is audited.'
        }
        size="sm"
        footer={
          <>
            <button type="button" className="btn-secondary" onClick={() => setPendingDecision('')}>
              Cancel
            </button>
            <button
              type="button"
              className={pendingDecision === 'approved' ? 'btn-primary' : 'btn-danger'}
              onClick={confirmDecision}
              disabled={review.isPending}
            >
              {review.isPending ? 'Saving…' : pendingDecision === 'approved' ? 'Approve file' : 'Reject file'}
            </button>
          </>
        }
      >
        <p className="text-[13px] leading-5 text-ink-muted">
          <span className="font-medium text-ink">Reason:</span> {reason}
        </p>
      </Modal>
    </div>
  );
}
