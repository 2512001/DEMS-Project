import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Eye, FileText, User, XCircle } from 'lucide-react';
import { getVerificationRequests, reviewVerificationRequest, reviewMembershipApplication } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { CardsSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../../utils/format.js';
import { useToast } from '../../components/ui/Toast.jsx';

function isMembershipApplication(user) {
  return user.membershipStatus === 'pending_approval';
}

export default function OfficerApproval() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [selectedUser, setSelectedUser] = useState(null);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['verification-requests'],
    queryFn: getVerificationRequests,
    retry: false
  });

  const review = useMutation({
    mutationFn: reviewVerificationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['org-overview'] });
      push('Verification request updated.', { tone: 'success' });
      setSelectedUser(null);
    },
    onError: (err) => push(err?.response?.data?.message || 'Review failed.', { tone: 'error' })
  });

  const reviewMembership = useMutation({
    mutationFn: reviewMembershipApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      queryClient.invalidateQueries({ queryKey: ['org-overview'] });
      push('Membership application updated.', { tone: 'success' });
      setSelectedUser(null);
    },
    onError: (err) => push(err?.response?.data?.message || 'Review failed.', { tone: 'error' })
  });

  const handleApprove = (user) => {
    if (isMembershipApplication(user)) {
      reviewMembership.mutate({ userId: user._id, status: 'approved' });
    } else {
      review.mutate({ walletAddress: user.walletAddress, status: 'approved' });
    }
  };

  const handleReject = (user) => {
    if (isMembershipApplication(user)) {
      reviewMembership.mutate({ userId: user._id, status: 'rejected', rejectionReason: 'Rejected by admin review.' });
    } else {
      review.mutate({ walletAddress: user.walletAddress, status: 'rejected', rejectionReason: 'Rejected by admin review.' });
    }
  };

  const requests = data?.data || [];
  const busy = review.isPending || reviewMembership.isPending;

  if (selectedUser) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Organization"
          title="Review application"
          subtitle={isMembershipApplication(selectedUser)
            ? 'Invitation-based employee membership application'
            : 'Legacy verification request'}
          actions={
            <button type="button" className="btn-secondary" onClick={() => setSelectedUser(null)}>
              Back to requests
            </button>
          }
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="section-card">
            <h2 className="section-title">Applicant</h2>
            <p className="section-subtitle">Identity and organization details</p>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="detail-label">Wallet address</dt>
                <dd className="mt-1"><span className="text-[13px] text-ink">Authorized applicant</span></dd>
              </div>
              <div>
                <dt className="detail-label">Display name</dt>
                <dd className="detail-value">{selectedUser.profile?.displayName || 'N/A'}</dd>
              </div>
              <div>
                <dt className="detail-label">Email</dt>
                <dd className="detail-value">{selectedUser.profile?.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="detail-label">Department</dt>
                <dd className="detail-value">{selectedUser.profile?.department || 'N/A'}</dd>
              </div>
              <div>
                <dt className="detail-label">Designation</dt>
                <dd className="detail-value">{selectedUser.profile?.designation || 'N/A'}</dd>
              </div>
              <div>
                <dt className="detail-label">Employee ID</dt>
                <dd className="detail-value">{selectedUser.profile?.employeeId || 'N/A'}</dd>
              </div>
              <div>
                <dt className="detail-label">Phone</dt>
                <dd className="detail-value">{selectedUser.profile?.phone || 'N/A'}</dd>
              </div>
              {!isMembershipApplication(selectedUser) ? (
                <>
                  <div>
                    <dt className="detail-label">Badge number</dt>
                    <dd className="detail-value">{selectedUser.officerVerification?.badgeNumber || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="detail-label">Government ID</dt>
                    <dd className="detail-value">{selectedUser.officerVerification?.governmentIdNumber || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="detail-label">Submitted</dt>
                    <dd className="detail-value">{formatDate(selectedUser.officerVerification?.requestedAt)}</dd>
                  </div>
                </>
              ) : null}
            </dl>
          </section>

          <section className="section-card">
            <h2 className="section-title">Submitted documents</h2>
            <p className="section-subtitle">Files provided during the application</p>

            {selectedUser.officerVerification?.documents?.length ? (
              <ul className="mt-4 divide-y divide-line rounded-[10px] border border-line">
                {selectedUser.officerVerification.documents.map((doc, index) => (
                  <li key={index} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-surface text-ink-muted">
                        <FileText size={13} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium text-ink">{doc.originalName}</p>
                        <p className="text-[11px] text-ink-faint">{((doc.size || 0) / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11.5px] text-ink-faint">
                      <Eye size={13} className="inline" /> attached
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[13px] text-ink-muted">No documents were submitted.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <button type="button" className="btn-primary" onClick={() => handleApprove(selectedUser)} disabled={busy}>
                <BadgeCheck size={14} />
                Approve employee
              </button>
              <button type="button" className="btn-secondary text-danger" onClick={() => handleReject(selectedUser)} disabled={busy}>
                <XCircle size={14} />
                Reject
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization"
        title="Employee approval"
        subtitle="Review employee membership applications and verification requests for your organization."
      />

      {isLoading ? (
        <CardsSkeleton count={3} />
      ) : isError ? (
        <div className="section-card">
          <div className="alert-danger">
            Verification requests could not be loaded.
            {error?.response?.data?.message && (
              <p className="mt-2 text-sm">{error.response.data.message}</p>
            )}
          </div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={User}
          title="No pending requests"
          description="New employee applications and verification requests will appear here."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((user) => (
            <section key={user._id} className="section-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink">
                      {user.profile?.displayName || 'Unknown applicant'}
                    </p>
                    <StatusBadge status={isMembershipApplication(user) ? user.membershipStatus : user.officerVerification?.status} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-ink-muted">
                    {user.profile?.email || 'No email'} ·{' '}
                    {isMembershipApplication(user)
                      ? `Applied ${formatRelativeTime(user.officerVerification?.requestedAt)}`
                      : `Submitted ${formatDate(user.officerVerification?.requestedAt)}`}
                  </p>
                  <div className="mt-1.5"><span className="text-[12px] text-ink-faint">Authorized applicant</span></div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setSelectedUser(user)}>
                    <Eye size={13} />
                    Review
                  </button>
                  <button type="button" className="btn-primary btn-sm" onClick={() => handleApprove(user)} disabled={busy}>
                    <BadgeCheck size={13} />
                    Approve
                  </button>
                </div>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
                {isMembershipApplication(user) ? (
                  <>
                    <div><dt className="detail-label">Department</dt><dd className="detail-value">{user.profile?.department || 'N/A'}</dd></div>
                    <div><dt className="detail-label">Position</dt><dd className="detail-value">{user.profile?.designation || 'N/A'}</dd></div>
                    <div><dt className="detail-label">Employee ID</dt><dd className="detail-value">{user.profile?.employeeId || 'N/A'}</dd></div>
                    <div><dt className="detail-label">Documents</dt><dd className="detail-value">{user.officerVerification?.documents?.length || 0} files</dd></div>
                  </>
                ) : (
                  <>
                    <div><dt className="detail-label">Badge</dt><dd className="detail-value">{user.officerVerification?.badgeNumber || 'N/A'}</dd></div>
                    <div><dt className="detail-label">Government ID</dt><dd className="detail-value">{user.officerVerification?.governmentIdNumber || 'N/A'}</dd></div>
                    <div><dt className="detail-label">Documents</dt><dd className="detail-value">{user.officerVerification?.documents?.length || 0} files</dd></div>
                  </>
                )}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
