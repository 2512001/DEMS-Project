import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, UserCheck, Users } from 'lucide-react';
import { getAuditLogs, getUsers, getVerificationRequests } from '../../api/admin.js';

export default function AdminDashboard() {
  const users = useQuery({ queryKey: ['admin-users'], queryFn: getUsers });
  const requests = useQuery({ queryKey: ['verification-requests'], queryFn: getVerificationRequests });
  const audits = useQuery({ queryKey: ['audit-logs'], queryFn: getAuditLogs });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="stat"><Users className="mb-3 text-sky-300" /><p className="text-3xl font-extrabold">{users.data?.count || 0}</p><p className="text-sm text-slate-400">Users</p></div>
      <div className="stat"><UserCheck className="mb-3 text-amber-300" /><p className="text-3xl font-extrabold">{requests.data?.count || 0}</p><p className="text-sm text-slate-400">Pending approvals</p></div>
      <div className="stat"><ClipboardList className="mb-3 text-emerald-300" /><p className="text-3xl font-extrabold">{audits.data?.count || 0}</p><p className="text-sm text-slate-400">Audit events</p></div>
    </div>
  );
}
