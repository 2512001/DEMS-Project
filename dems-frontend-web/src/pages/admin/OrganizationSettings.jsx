import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Copy, Check, AlertTriangle } from 'lucide-react';
import { getOrganization, updateOrganizationSettings } from '../../api/admin.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function OrganizationSettings() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const [name, setName] = useState('');
  const [requireAI, setRequireAI] = useState(true);
  const [requireChain, setRequireChain] = useState(false);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name || '');
    setRequireAI(data.policy?.requireAIForEmployees !== false);
    setRequireChain(Boolean(data.policy?.requireBlockchainForEmployees));
  }, [data]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = useMutation({
    mutationFn: () => updateOrganizationSettings({
      name,
      requireAIForEmployees: requireAI,
      requireBlockchainForEmployees: requireChain
    }),
    onSuccess: () => setNotice('Organization settings saved.')
  });

  // Super admin doesn't have organization settings - they manage organizations from Super Admin Dashboard
  if (user?.role === 'super_admin') {
    return (
      <div className="section-card max-w-2xl">
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-950/20">
          <AlertTriangle className="text-amber-400 mt-1" size={20} />
          <div>
            <h2 className="font-bold text-lg mb-2">Super Admin Organization Management</h2>
            <p className="text-sm text-slate-300 mb-3">
              As a Super Admin, you manage organizations from the Super Admin Dashboard. This page is for Organization Admins to manage their specific organization settings.
            </p>
            <a href="/superadmin/dashboard" className="text-sky-400 hover:text-sky-300 text-sm">
              Go to Super Admin Dashboard →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="section-card max-w-2xl">
        <h1 className="mb-4 text-2xl font-extrabold">Organization Settings</h1>
        <p className="text-slate-400">No organization found. Please contact your Super Admin to assign you to an organization.</p>
      </div>
    );
  }

  return (
    <div className="section-card max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold">Organization Settings</h1>
      
      {data?.organizationCode && (
        <div className="mb-4 p-4 rounded-lg border border-sky-500/30 bg-sky-950/20">
          <p className="text-sm text-slate-400 mb-2">Organization Code (share with employees)</p>
          <div className="flex items-center gap-2">
            <code className="text-xl font-mono text-sky-300">{data.organizationCode}</code>
            <button 
              type="button" 
              onClick={() => copyToClipboard(data.organizationCode)}
              className="p-2 rounded hover:bg-sky-500/20 transition-colors"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-slate-400" />}
            </button>
          </div>
        </div>
      )}

      <label className="mb-4 block"><span className="label">Name</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="mb-3 flex items-center justify-between text-sm text-slate-300">
        <span>Require AI for employees</span>
        <input type="checkbox" checked={requireAI} onChange={(event) => setRequireAI(event.target.checked)} />
      </label>
      <label className="mb-5 flex items-center justify-between text-sm text-slate-300">
        <span>Require blockchain for employees</span>
        <input type="checkbox" checked={requireChain} onChange={(event) => setRequireChain(event.target.checked)} />
      </label>
      <button className="btn-primary" type="button" onClick={() => save.mutate()} disabled={save.isPending}>Save settings</button>
      {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}
    </div>
  );
}
