import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Building2, Check, Copy, Settings } from 'lucide-react';
import { getOrganization, updateOrganizationSettings } from '../../api/admin.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function OrganizationSettings() {
  const { user } = useAuth();
  const { push } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const [name, setName] = useState('');
  const [requireAI, setRequireAI] = useState(true);
  const [requireChain, setRequireChain] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name || '');
    setRequireAI(data.policy?.requireAIForEmployees !== false);
    setRequireChain(Boolean(data.policy?.requireBlockchainForEmployees));
  }, [data]);

  const copyCode = () => {
    navigator.clipboard.writeText(data?.organizationCode || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const save = useMutation({
    mutationFn: () => updateOrganizationSettings({
      name,
      requireAIForEmployees: requireAI,
      requireBlockchainForEmployees: requireChain
    }),
    onSuccess: () => push('Organization settings saved.', { tone: 'success' }),
    onError: (err) => push(err?.response?.data?.message || 'Settings could not be saved.', { tone: 'error' })
  });

  if (user?.role === 'super_admin') {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Settings" title="Organization settings" />
        <div className="section-card max-w-2xl">
          <div className="alert-warn">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Platform administration</p>
              <p className="mt-1">
                Super Admins manage organizations from the platform overview. This page is for Organization Admins managing a single organization.
              </p>
              <a href="/superadmin/dashboard" className="mt-2 inline-block font-medium underline underline-offset-2">
                Go to platform overview
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <span className="skeleton block h-7 w-56" />
        <div className="section-card max-w-2xl space-y-4">
          <span className="skeleton block h-3 w-40" />
          <span className="skeleton block h-10 w-full" />
          <span className="skeleton block h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Settings" title="Organization settings" />
        <div className="section-card max-w-2xl">
          <div className="alert-info">
            <Building2 size={16} className="mt-0.5 shrink-0" />
            <span>No organization is assigned to your account yet. Contact your Super Admin to be assigned to an organization.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Organization settings"
        subtitle="Your organization profile and the policy applied to employee uploads."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="section-card">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-surface text-ink-muted">
              <Settings size={16} />
            </span>
            <div>
              <h2 className="section-title">General</h2>
              <p className="section-subtitle">Names and identifiers visible to your team</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="label">Organization name</span>
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
            </label>

            <div>
              <span className="label">Organization code</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-control border border-line bg-[#FBFCFD] px-3 py-2 font-mono text-[13px] text-ink">
                  {data.organizationCode}
                </code>
                <button type="button" className="btn-secondary" onClick={copyCode} aria-label="Copy organization code">
                  {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <span className="hint">Share this code with employees so they can request membership.</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="detail-label">Type</p>
                <p className="detail-value capitalize">{String(data.organizationType || 'other').replaceAll('_', ' ')}</p>
              </div>
              <div>
                <p className="detail-label">Status</p>
                <p className="detail-value capitalize">{data.status || 'active'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">Upload policy</h2>
          <p className="section-subtitle">Controls applied to employee uploads</p>

          <div className="mt-4 space-y-2">
            <label className="flex items-start justify-between gap-4 rounded-[10px] border border-line px-3.5 py-3">
              <span>
                <span className="block text-[13px] font-medium text-ink">Require AI verification</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-ink-faint">
                  Every employee upload is screened for manipulation before storage.
                </span>
              </span>
              <input
                type="checkbox"
                className="checkbox mt-0.5"
                checked={requireAI}
                onChange={(event) => setRequireAI(event.target.checked)}
              />
            </label>

            <label className="flex items-start justify-between gap-4 rounded-[10px] border border-line px-3.5 py-3">
              <span>
                <span className="block text-[13px] font-medium text-ink">Require blockchain proof</span>
                <span className="mt-0.5 block text-[12px] leading-5 text-ink-faint">
                  Employees must record an on-chain integrity hash via MetaMask.
                </span>
              </span>
              <input
                type="checkbox"
                className="checkbox mt-0.5"
                checked={requireChain}
                onChange={(event) => setRequireChain(event.target.checked)}
              />
            </label>
          </div>

          <button
            type="button"
            className="btn-primary mt-4"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending ? 'Saving…' : 'Save settings'}
          </button>
        </section>
      </div>
    </div>
  );
}
