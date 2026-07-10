import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Clock, Shield } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';

export default function CitizenDashboard() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['my-files'], queryFn: getMyFiles });
  const files = data?.data || [];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="stat"><Archive className="mb-3 text-sky-300" /><p className="text-3xl font-extrabold">{files.length}</p><p className="text-sm text-slate-400">Personal files</p></div>
        <div className="stat"><Shield className="mb-3 text-emerald-300" /><p className="text-3xl font-extrabold">{user?.role}</p><p className="text-sm text-slate-400">Current role</p></div>
        <div className="stat"><Clock className="mb-3 text-amber-300" /><StatusBadge status={user?.officerVerification?.status || 'none'} /><p className="mt-2 text-sm text-slate-400">Officer verification</p></div>
      </div>
      <div className="section-card">
        <h2 className="mb-2 text-xl font-bold">Citizen Command Summary</h2>
        <p className="leading-7 text-slate-400">Use the vault for encrypted personal evidence storage. Submit officer verification documents from Profile when you need access to live evidence capture.</p>
      </div>
    </div>
  );
}
