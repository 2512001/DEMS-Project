import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, ShieldAlert, Users } from 'lucide-react';
import { getOrganizationOverview } from '../../api/admin.js';

export default function AdminDashboard() {
  const overview = useQuery({ queryKey: ['org-overview'], queryFn: getOrganizationOverview });
  const data = overview.data || {};

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <div className="stat"><Users className="mb-3 text-sky-300" /><p className="text-3xl font-extrabold">{data.employees || 0}</p><p className="text-sm text-slate-400">Employees</p></div>
      <div className="stat"><ClipboardList className="mb-3 text-sky-300" /><p className="text-3xl font-extrabold">{data.totalEvidence || 0}</p><p className="text-sm text-slate-400">Total evidence</p></div>
      <div className="stat"><ShieldAlert className="mb-3 text-amber-300" /><p className="text-3xl font-extrabold">{data.pendingReview || 0}</p><p className="text-sm text-slate-400">Pending review</p></div>
      <div className="stat"><ShieldAlert className="mb-3 text-amber-300" /><p className="text-3xl font-extrabold">{data.quarantined || 0}</p><p className="text-sm text-slate-400">Quarantined</p></div>
      <div className="stat"><ClipboardList className="mb-3 text-emerald-300" /><p className="text-3xl font-extrabold">{data.blockchain || 0}</p><p className="text-sm text-slate-400">Blockchain proofs</p></div>
    </div>
  );
}
