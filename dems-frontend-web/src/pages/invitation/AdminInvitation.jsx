import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Building2, Calendar, Check, Mail, ShieldCheck, X } from 'lucide-react';
import { getInvitationByToken, acceptAdminInvitation } from '../../api/invitations.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import BrandMark from '../../components/ui/BrandMark.jsx';
import { formatDate } from '../../utils/format.js';

function InvitationShell({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-start justify-center py-10">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <div className="section-card">{children}</div>
        <p className="mt-4 text-center text-[11.5px] text-ink-faint">
          Invitations are time-limited and can only be used once.
        </p>
      </div>
    </div>
  );
}

function InvitationProblem({ title, description }) {
  return (
    <InvitationShell>
      <div className="text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
          <X size={20} />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold text-ink">{title}</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">{description}</p>
        <Link to="/auth/wallet-login" className="btn-secondary mt-5">
          Go to sign in
        </Link>
      </div>
    </InvitationShell>
  );
}

export default function AdminInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [form, setForm] = useState({ email: '', name: '', phone: '' });
  const [error, setError] = useState('');

  const invitationQuery = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitationByToken(token),
    enabled: Boolean(token)
  });

  const acceptInvitation = useMutation({
    mutationFn: (data) => acceptAdminInvitation(token, data),
    onSuccess: async () => {
      await refreshUser();
      navigate('/admin/dashboard', { replace: true });
    },
    onError: (err) => setError(err.response?.data?.message || 'The invitation could not be accepted.')
  });

  if (!token) {
    return <InvitationProblem title="Invalid invitation link" description="This link is missing the invitation token." />;
  }

  if (invitationQuery.isLoading) {
    return (
      <InvitationShell>
        <div className="space-y-3">
          <span className="skeleton block h-4 w-1/2" />
          <span className="skeleton block h-24 w-full rounded-[10px]" />
          <span className="skeleton block h-10 w-full" />
        </div>
      </InvitationShell>
    );
  }

  if (invitationQuery.error || !invitationQuery.data?.data) {
    return (
      <InvitationProblem
        title="Invitation unavailable"
        description={invitationQuery.error?.message || 'This invitation is invalid or has expired. Ask your administrator for a new one.'}
      />
    );
  }

  const invitation = invitationQuery.data.data;
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <InvitationShell>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand">
          <Mail size={16} />
        </span>
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Administrator invitation</h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">
            You have been invited to administer an organization on DEMS.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-line bg-[#FBFCFD] p-3.5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Building2 size={14} className="text-ink-muted" />
          {invitation.organizationId?.name || 'Organization'}
        </p>
        <dl className="mt-2.5 grid gap-2 text-[12.5px]">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Organization code</dt>
            <dd className="font-mono text-ink">{invitation.organizationId?.organizationCode || '—'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">Invited email</dt>
            <dd className="truncate text-ink">{invitation.invitedEmail}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-ink-muted"><Calendar size={12} /> Expires</dt>
            <dd className="text-ink">{formatDate(invitation.expiresAt)}</dd>
          </div>
        </dl>
      </div>

      {!isAuthenticated ? (
        <div className="alert-warn mt-4">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            Sign in with the wallet you want to use as administrator, then open this invitation link again.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="alert-danger mt-4" role="alert">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form
        className="mt-4 space-y-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          acceptInvitation.mutate({
            email: form.email || invitation.invitedEmail,
            name: form.name || invitation.invitedName,
            phone: form.phone
          });
        }}
      >
        <label className="block">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder={invitation.invitedEmail || 'you@example.com'}
            required
          />
        </label>
        <label className="block">
          <span className="label">Full name</span>
          <input
            className="input"
            value={form.name}
            onChange={set('name')}
            placeholder={invitation.invitedName || 'Jane Doe'}
            required
          />
        </label>
        <label className="block">
          <span className="label">Phone <span className="font-normal text-ink-faint">(optional)</span></span>
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" />
        </label>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={acceptInvitation.isPending || !isAuthenticated}
        >
          {acceptInvitation.isPending ? (
            'Accepting…'
          ) : (
            <>
              <Check size={15} />
              Accept invitation
            </>
          )}
        </button>

        {!isAuthenticated ? (
          <Link to="/auth/wallet-login" className="btn-secondary w-full">
            Sign in first
          </Link>
        ) : null}
      </form>

      {user?.role === 'admin' ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-faint">
          <ShieldCheck size={12} />
          Your current organization access is replaced by this assignment.
        </p>
      ) : null}
    </InvitationShell>
  );
}
