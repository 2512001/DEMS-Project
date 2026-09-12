import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listModificationRequests, reviewModificationRequest } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

export default function AdminModifications() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const { data } = useQuery({ queryKey: ['modifications'], queryFn: listModificationRequests });
  const review = useMutation({
    mutationFn: ({ id, decision }) => reviewModificationRequest(id, { decision, reason }),
    onSuccess: () => {
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['modifications'] });
    }
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Modification Requests</h1>
      <textarea className="input min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Review reason" />
      {(data?.data || []).map((item) => (
        <div className="section-card" key={item._id}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">{item.evidenceId?.fileName || item.evidenceId}</p>
              <p className="text-sm text-slate-400">{item.changeReason}</p>
              <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
          {item.status === 'pending' ? (
            <div className="mt-4 flex gap-3">
              <button className="btn-primary" type="button" onClick={() => review.mutate({ id: item._id, decision: 'approved' })}>Approve</button>
              <button className="btn-secondary" type="button" onClick={() => review.mutate({ id: item._id, decision: 'rejected' })}>Reject</button>
            </div>
          ) : <p className="mt-3 text-sm text-slate-400">{item.adminDecisionReason}</p>}
        </div>
      ))}
      {!data?.data?.length ? <div className="section-card text-slate-400">No modification requests.</div> : null}
    </div>
  );
}
