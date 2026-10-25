import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, ShieldCheck, XCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getPendingUploads, approvePendingUpload, rejectPendingUpload } from '../../api/controlledUpload.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { formatBytes, formatDate, formatRelativeTime } from '../../utils/format.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function PendingUploads() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const { role } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const list = useQuery({ 
    queryKey: ['pending-uploads'], 
    queryFn: () => getPendingUploads({ status: 'pending_org_admin_approval' }) 
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, signature }) => {
      // In a real implementation, this would prompt for MetaMask signature
      // For now, we'll simulate with a placeholder
      const mockSignature = '0x' + 'a'.repeat(130);
      return approvePendingUpload(requestId, mockSignature, 'Approved after review');
    },
    onSuccess: () => {
      setError('');
      setSelectedId('');
      queryClient.invalidateQueries({ queryKey: ['pending-uploads'] });
      push('Upload approved successfully', { tone: 'success' });
    },
    onError: (err) => setError(err?.response?.data?.message || err.message)
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId }) => rejectPendingUpload(requestId, rejectReason),
    onSuccess: () => {
      setError('');
      setRejectReason('');
      setSelectedId('');
      queryClient.invalidateQueries({ queryKey: ['pending-uploads'] });
      push('Upload rejected', { tone: 'warning' });
    },
    onError: (err) => setError(err?.response?.data?.message || err.message)
  });

  const handleApprove = (requestId) => {
    setSelectedId(requestId);
    approveMutation.mutate({ requestId });
  };

  const handleReject = (requestId) => {
    if (!rejectReason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    setSelectedId(requestId);
    rejectMutation.mutate({ requestId });
  };

  const requests = list.data?.requests || [];
  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Controlled Evidence"
        title="Pending upload approvals"
        subtitle={
          isSuperAdmin
            ? 'Review and approve evidence uploads requiring Super Admin authorization'
            : 'Review and approve evidence uploads from your organization'
        }
        meta={<span className="badge-brand"><ShieldCheck size={11} /> {requests.length} pending</span>}
      />

      {list.isLoading ? (
        <div className="panel p-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-[10px] border border-line p-4">
                <span className="skeleton block h-4 w-1/3" />
                <span className="skeleton mt-2 block h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : list.isError ? (
        <div className="alert-danger">Failed to load pending uploads</div>
      ) : requests.length === 0 ? (
        <div className="panel p-12 text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-success" />
          <h3 className="text-lg font-semibold text-ink">No pending uploads</h3>
          <p className="mt-2 text-sm text-ink-muted">
            All upload requests have been processed
          </p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="card-header">
            <h2 className="section-title">Approval queue</h2>
            <p className="section-subtitle">Uploads awaiting your approval</p>
          </div>
          <div className="divide-y divide-line">
            {requests.map((request) => (
              <div key={request._id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-ink-muted" />
                      <h3 className="font-medium text-ink">{request.fileName}</h3>
                      <StatusBadge status={request.workflowStatus} />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-ink-faint">Evidence ID</p>
                        <p className="font-mono text-xs text-ink">{request.evidenceId}</p>
                      </div>
                      <div>
                        <p className="text-ink-faint">Case ID</p>
                        <p className="text-ink">{request.caseId || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-ink-faint">File size</p>
                        <p className="text-ink">{formatBytes(request.fileSize)}</p>
                      </div>
                      <div>
                        <p className="text-ink-faint">Submitted</p>
                        <p className="text-ink">{formatRelativeTime(request.createdAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                      <Clock size={12} />
                      <span>Expires: {formatDate(request.expiresAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => handleApprove(request._id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm text-danger"
                      onClick={() => setSelectedId(request._id)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>

                {selectedId === request._id && (
                  <div className="mt-4 border-t border-line pt-4">
                    <label className="block">
                      <span className="label">Rejection reason</span>
                      <textarea
                        className="textarea min-h-[60px] mt-1"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this upload is being rejected"
                      />
                    </label>
                    {error && <p className="mt-2 text-sm text-danger">{error}</p>}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleReject(request._id)}
                        disabled={rejectMutation.isPending}
                      >
                        Confirm rejection
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedId('');
                          setRejectReason('');
                          setError('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
