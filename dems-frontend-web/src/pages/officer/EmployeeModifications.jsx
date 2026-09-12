import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createModificationRequest, listModificationRequests } from '../../api/admin.js';
import { getMyFiles } from '../../api/evidence.js';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function EmployeeModifications() {
  const queryClient = useQueryClient();
  const files = useQuery({ queryKey: ['my-files'], queryFn: getMyFiles });
  const requests = useQuery({ queryKey: ['modifications'], queryFn: listModificationRequests });
  const [evidenceId, setEvidenceId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [proposedCaseId, setProposedCaseId] = useState('');

  const create = useMutation({
    mutationFn: () => createModificationRequest({ evidenceId, changeReason, proposedCaseId }),
    onSuccess: () => {
      setChangeReason('');
      setProposedCaseId('');
      queryClient.invalidateQueries({ queryKey: ['modifications'] });
    }
  });

  return (
    <div className="grid gap-5">
      <form className="section-card" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <h1 className="mb-4 text-2xl font-extrabold">Request Modification</h1>
        <p className="mb-4 text-sm text-slate-400">Employees cannot overwrite trusted evidence directly. Submit a request for admin review.</p>
        <label className="mb-3 block">
          <span className="label">Evidence</span>
          <select className="input" value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} required>
            <option value="">Select evidence</option>
            {(files.data?.data || []).map((file) => (
              <option key={file._id} value={file._id}>{file.fileName}</option>
            ))}
          </select>
        </label>
        <label className="mb-3 block"><span className="label">Proposed case ID</span><input className="input" value={proposedCaseId} onChange={(event) => setProposedCaseId(event.target.value)} /></label>
        <label className="mb-4 block"><span className="label">Reason</span><textarea className="input min-h-24" value={changeReason} onChange={(event) => setChangeReason(event.target.value)} required /></label>
        <button className="btn-primary" disabled={create.isPending}>Submit request</button>
      </form>

      {(requests.data?.data || []).map((item) => (
        <div className="section-card" key={item._id}>
          <div className="flex items-center justify-between">
            <p className="text-white">{item.evidenceId?.fileName || item.evidenceId}</p>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-2 text-sm text-slate-400">{item.changeReason}</p>
        </div>
      ))}
    </div>
  );
}
