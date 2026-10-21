import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Send } from 'lucide-react';
import { createModificationRequest, listModificationRequests } from '../../api/admin.js';
import { getMyFiles } from '../../api/evidence.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { CardsSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate } from '../../utils/format.js';
import { useToast } from '../../components/ui/Toast.jsx';

export default function EmployeeModifications() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const files = useQuery({ queryKey: ['my-files'], queryFn: () => getMyFiles(1, 50) });
  const requests = useQuery({ queryKey: ['modifications'], queryFn: listModificationRequests });

  const [evidenceId, setEvidenceId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [proposedCaseId, setProposedCaseId] = useState('');

  const create = useMutation({
    mutationFn: () => createModificationRequest({ evidenceId, changeReason, proposedCaseId }),
    onSuccess: () => {
      setChangeReason('');
      setProposedCaseId('');
      setEvidenceId('');
      queryClient.invalidateQueries({ queryKey: ['modifications'] });
      push('Modification request submitted for review.', { tone: 'success' });
    },
    onError: (err) => push(err?.response?.data?.message || 'Request could not be submitted.', { tone: 'error' })
  });

  const availableFiles = files.data?.data || [];
  const requestsList = requests.data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Modification requests"
        subtitle="Stored files cannot be overwritten directly. Request a reviewed change instead."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <form
          className="section-card"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          <h2 className="section-title">New request</h2>
          <p className="section-subtitle">Your administrator reviews every change</p>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="label">File</span>
              <select
                className="select"
                value={evidenceId}
                onChange={(event) => setEvidenceId(event.target.value)}
                required
              >
                <option value="">Select a file</option>
                {availableFiles.map((file) => (
                  <option key={file._id} value={file._id}>{file.fileName}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="label">Proposed case ID <span className="font-normal text-ink-faint">(optional)</span></span>
              <input
                className="input"
                value={proposedCaseId}
                onChange={(event) => setProposedCaseId(event.target.value)}
                placeholder="CASE-2026-002"
              />
            </label>

            <label className="block">
              <span className="label">Reason</span>
              <textarea
                className="textarea min-h-[104px]"
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
                placeholder="Explain what should change and why. This is recorded in the audit log."
                required
              />
            </label>
          </div>

          <button type="submit" className="btn-primary mt-4" disabled={create.isPending || !evidenceId}>
            <Send size={14} />
            {create.isPending ? 'Submitting…' : 'Submit request'}
          </button>
        </form>

        <section className="space-y-3">
          <div>
            <h2 className="section-title">Your requests</h2>
            <p className="section-subtitle">Track the status of each request</p>
          </div>

          {requests.isLoading ? (
            <CardsSkeleton count={2} />
          ) : requestsList.length === 0 ? (
            <EmptyState
              compact
              icon={ClipboardList}
              title="No requests yet"
              description="Submitted modification requests and their outcomes appear here."
            />
          ) : (
            requestsList.map((item) => (
              <div key={item._id} className="section-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {item.evidenceId?.fileName || 'Unknown file'}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">{item.changeReason}</p>
                    <p className="mt-1 text-[11.5px] text-ink-faint">{formatDate(item.createdAt)}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                {item.adminDecisionReason ? (
                  <p className="mt-2 text-[12.5px] text-ink-muted">Administrator: {item.adminDecisionReason}</p>
                ) : null}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
