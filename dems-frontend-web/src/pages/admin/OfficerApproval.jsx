import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, XCircle } from 'lucide-react';
import { getVerificationRequests, reviewVerificationRequest, upgradeOfficer } from '../../api/admin.js';
import HashValue from '../../components/HashValue.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

export default function OfficerApproval() {
  const queryClient = useQueryClient();
  const [manualWallet, setManualWallet] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['verification-requests'], queryFn: getVerificationRequests });
  const review = useMutation({
    mutationFn: reviewVerificationRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['verification-requests'] })
  });
  const manualUpgrade = useMutation({ mutationFn: upgradeOfficer });

  return (
    <div className="grid gap-5">
      <div className="section-card">
        <h1 className="mb-2 text-2xl font-extrabold">Verification Requests</h1>
        <p className="text-sm text-slate-400">Backend source: GET /api/admin/verification-requests</p>
      </div>
      <div className="grid gap-4">
        {isLoading ? <div className="section-card text-slate-400">Loading requests...</div> : null}
        {(data?.data || []).map((user) => (
          <div className="section-card" key={user._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <HashValue value={user.walletAddress} compact={false} />
                <p className="mt-2 text-sm text-slate-400">Requested {formatDate(user.officerVerification?.requestedAt)}</p>
              </div>
              <StatusBadge status={user.officerVerification?.status} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <p><span className="label">Badge</span>{user.officerVerification?.badgeNumber}</p>
              <p><span className="label">Government ID</span>{user.officerVerification?.governmentIdNumber}</p>
              <p><span className="label">Aadhaar</span>{user.officerVerification?.aadhaarNumber}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={() => review.mutate({ walletAddress: user.walletAddress, status: 'approved' })}><BadgeCheck size={16} />Approve Officer</button>
              <button className="btn-secondary" onClick={() => review.mutate({ walletAddress: user.walletAddress, status: 'rejected', rejectionReason: 'Rejected by admin review.' })}><XCircle size={16} />Reject</button>
            </div>
          </div>
        ))}
        {!isLoading && !data?.data?.length ? <div className="section-card text-slate-400">No pending verification requests.</div> : null}
      </div>
      <div className="section-card">
        <h2 className="mb-3 text-xl font-bold">Manual Compatibility Upgrade</h2>
        <div className="flex gap-3 max-sm:flex-col">
          <input className="input" value={manualWallet} onChange={(event) => setManualWallet(event.target.value)} placeholder="0x..." />
          <button className="btn-secondary" onClick={() => manualUpgrade.mutate(manualWallet)} disabled={!manualWallet}>Upgrade</button>
        </div>
      </div>
    </div>
  );
}
