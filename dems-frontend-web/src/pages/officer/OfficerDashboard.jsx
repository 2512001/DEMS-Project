import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, FileCheck2, ShieldCheck } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';

export default function OfficerDashboard() {
  const { data } = useQuery({ queryKey: ['my-files'], queryFn: getMyFiles });
  const files = data?.data || [];
  const pending = files.filter((file) => file.status === 'pending_blockchain').length;
  const stored = files.filter((file) => file.status === 'stored_on_chain').length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="stat"><Database className="mb-3 text-sky-300" /><p className="text-3xl font-extrabold">{files.length}</p><p className="text-sm text-slate-400">Officer uploads</p></div>
      <div className="stat"><FileCheck2 className="mb-3 text-amber-300" /><p className="text-3xl font-extrabold">{pending}</p><p className="text-sm text-slate-400">Pending blockchain</p></div>
      <div className="stat"><ShieldCheck className="mb-3 text-emerald-300" /><p className="text-3xl font-extrabold">{stored}</p><p className="text-sm text-slate-400">Stored on-chain</p></div>
    </div>
  );
}
