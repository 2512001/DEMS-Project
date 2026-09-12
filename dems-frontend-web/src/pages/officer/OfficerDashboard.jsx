import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, FileCheck2, ShieldCheck } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';
import { listQuarantine } from '../../api/admin.js';

export default function OfficerDashboard() {
  const { data } = useQuery({ queryKey: ['my-files'], queryFn: () => getMyFiles(1, 50) });
  const quarantine = useQuery({ queryKey: ['quarantine'], queryFn: listQuarantine });
  const files = data?.data || [];
  const pending = (quarantine.data?.data || []).filter((item) => item.reviewStatus === 'pending_review').length;
  const stored = files.filter((file) => file.storageStatus === 'ipfs' || file.status === 'stored_on_chain' || file.status === 'stored_ipfs').length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="stat"><Database className="mb-3 text-sky-300" /><p className="text-3xl font-extrabold">{files.length}</p><p className="text-sm text-slate-400">Trusted uploads</p></div>
      <div className="stat"><FileCheck2 className="mb-3 text-amber-300" /><p className="text-3xl font-extrabold">{pending}</p><p className="text-sm text-slate-400">Pending admin review</p></div>
      <div className="stat"><ShieldCheck className="mb-3 text-emerald-300" /><p className="text-3xl font-extrabold">{stored}</p><p className="text-sm text-slate-400">Stored on IPFS</p></div>
    </div>
  );
}
