import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, XCircle, Eye, AlertTriangle, FileText, User } from 'lucide-react';
import { getVerificationRequests, reviewVerificationRequest, reviewMembershipApplication, upgradeOfficer } from '../../api/admin.js';
import HashValue from '../../components/HashValue.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

export default function OfficerApproval() {
  const queryClient = useQueryClient();
  const [manualWallet, setManualWallet] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const { data, isLoading } = useQuery({ queryKey: ['verification-requests'], queryFn: getVerificationRequests });
  const review = useMutation({
    mutationFn: reviewVerificationRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      setSelectedUser(null);
    }
  });
  const reviewMembership = useMutation({
    mutationFn: reviewMembershipApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests'] });
      setSelectedUser(null);
    }
  });
  const manualUpgrade = useMutation({ mutationFn: upgradeOfficer });

  const handleApprove = (user) => {
    if (user.membershipStatus === 'pending_approval') {
      reviewMembership.mutate({ userId: user._id, status: 'approved' });
    } else {
      review.mutate({ walletAddress: user.walletAddress, status: 'approved' });
    }
  };

  const handleReject = (user) => {
    if (user.membershipStatus === 'pending_approval') {
      reviewMembership.mutate({ userId: user._id, status: 'rejected', rejectionReason: 'Rejected by admin review.' });
    } else {
      review.mutate({ walletAddress: user.walletAddress, status: 'rejected', rejectionReason: 'Rejected by admin review.' });
    }
  };

  const isMembershipApplication = (user) => user.membershipStatus === 'pending_approval';

  return (
    <div className="grid gap-5">
      <div className="section-card">
        <h1 className="mb-2 text-2xl font-extrabold">Employee Approval</h1>
        <p className="text-sm text-slate-400">Review and approve employee verification requests for your organization</p>
      </div>
      
      <div className="grid gap-4">
        {isLoading ? <div className="section-card text-slate-400">Loading requests...</div> : null}
        
        {selectedUser ? (
          <div className="section-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Review Application</h2>
              <button 
                className="text-sm text-slate-400 hover:text-white"
                onClick={() => setSelectedUser(null)}
              >
                ← Back to list
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="label">Wallet Address</p>
                <HashValue value={selectedUser.walletAddress} compact={false} />
              </div>

              {isMembershipApplication(selectedUser) ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="label">Display Name</p>
                      <p className="text-slate-300">{selectedUser.profile?.displayName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Email</p>
                      <p className="text-slate-300">{selectedUser.profile?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Department</p>
                      <p className="text-slate-300">{selectedUser.profile?.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Designation</p>
                      <p className="text-slate-300">{selectedUser.profile?.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Employee ID</p>
                      <p className="text-slate-300">{selectedUser.profile?.employeeId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Phone</p>
                      <p className="text-slate-300">{selectedUser.profile?.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="label mb-2">Submitted Documents</p>
                    {selectedUser.officerVerification?.documents?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.officerVerification.documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-700">
                            <div>
                              <p className="text-sm text-slate-300">{doc.originalName}</p>
                              <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
                              <Eye size={14} /> View
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No documents submitted</p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/20">
                    <p className="text-sm text-amber-300">
                      <User size={14} className="inline mr-2" />
                      This is an invitation-based employee application
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="label">Badge Number</p>
                      <p className="text-slate-300">{selectedUser.officerVerification?.badgeNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Government ID</p>
                      <p className="text-slate-300">{selectedUser.officerVerification?.governmentIdNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="label">Submitted</p>
                      <p className="text-slate-300">{formatDate(selectedUser.officerVerification?.requestedAt)}</p>
                    </div>
                  </div>

                  <div>
                    <p className="label mb-2">Submitted Documents</p>
                    {selectedUser.officerVerification?.documents?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.officerVerification.documents.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-700">
                            <div>
                              <p className="text-sm text-slate-300">{doc.originalName}</p>
                              <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1">
                              <Eye size={14} /> View
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No documents submitted</p>
                    )}
                  </div>

                  <div className="p-3 rounded-lg border border-slate-500/30 bg-slate-950/20">
                    <p className="text-sm text-slate-300">
                      <FileText size={14} className="inline mr-2" />
                      This is a legacy verification request
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700">
                <button 
                  className="btn-primary" 
                  onClick={() => handleApprove(selectedUser)}
                  disabled={review.isPending || reviewMembership.isPending}
                >
                  <BadgeCheck size={16} /> Approve Employee
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => handleReject(selectedUser)}
                  disabled={review.isPending || reviewMembership.isPending}
                >
                  <XCircle size={16} /> Reject
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {(data?.data || []).map((user) => (
              <div className="section-card" key={user._id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <HashValue value={user.walletAddress} compact={false} />
                    {isMembershipApplication(user) ? (
                      <p className="mt-2 text-sm text-slate-400">
                        {user.profile?.displayName || 'Unknown'} • {user.profile?.email || 'No email'}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-slate-400">Submitted {formatDate(user.officerVerification?.requestedAt)}</p>
                    )}
                  </div>
                  <StatusBadge status={isMembershipApplication(user) ? user.membershipStatus : user.officerVerification?.status} />
                </div>
                
                {isMembershipApplication(user) ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <p><span className="label">Name</span>{user.profile?.displayName || 'N/A'}</p>
                    <p><span className="label">Email</span>{user.profile?.email || 'N/A'}</p>
                    <p><span className="label">Position</span>{user.profile?.designation || 'N/A'}</p>
                    <p><span className="label">Department</span>{user.profile?.department || 'N/A'}</p>
                    <p><span className="label">Employee ID</span>{user.profile?.employeeId || 'N/A'}</p>
                    <p><span className="label">Documents</span>{user.officerVerification?.documents?.length || 0} files</p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <p><span className="label">Badge</span>{user.officerVerification?.badgeNumber || 'N/A'}</p>
                    <p><span className="label">Government ID</span>{user.officerVerification?.governmentIdNumber || 'N/A'}</p>
                    <p><span className="label">Documents</span>{user.officerVerification?.documents?.length || 0} files</p>
                  </div>
                )}
                
                <div className="mt-4 flex flex-wrap gap-3">
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSelectedUser(user)}
                  >
                    <Eye size={16} /> Review Documents
                  </button>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleApprove(user)}
                    disabled={review.isPending || reviewMembership.isPending}
                  >
                    <BadgeCheck size={16} /> Approve
                  </button>
                  <button 
                    className="btn-secondary text-red-400 hover:text-red-300" 
                    onClick={() => handleReject(user)}
                    disabled={review.isPending || reviewMembership.isPending}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            ))}
            {!isLoading && !data?.data?.length ? (
              <div className="section-card text-slate-400">
                <div className="flex items-center justify-center gap-3 py-8">
                  <AlertTriangle size={24} className="text-slate-500" />
                  <p>No pending employee verification requests.</p>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="section-card">
        <h2 className="mb-3 text-xl font-bold">Manual Compatibility Upgrade</h2>
        <p className="text-sm text-slate-400 mb-3">⚠️ Development tool - bypasses verification process</p>
        <div className="flex gap-3 max-sm:flex-col">
          <input className="input" value={manualWallet} onChange={(event) => setManualWallet(event.target.value)} placeholder="0x..." />
          <button className="btn-secondary" onClick={() => manualUpgrade.mutate(manualWallet)} disabled={!manualWallet}>Upgrade</button>
        </div>
      </div>
    </div>
  );
}
