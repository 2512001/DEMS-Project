import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Briefcase,
  Check,
  ChevronDown,
  Loader2,
  Search,
  UploadCloud,
  Wallet
} from 'lucide-react';

import { updateProfile } from '../../api/auth.js';
import { resolveOrganizationByCode, submitVerificationRequest } from '../../api/admin.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import RoleBadge from '../../components/RoleBadge.jsx';
import HashValue from '../../components/HashValue.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDate, initials, shortAddress } from '../../utils/format.js';

const profileSchema = z.object({
  displayName: z.string().max(120).optional(),
  email: z.string().email().or(z.literal('')).optional()
});

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { push } = useToast();
  const [showEmployeeSection, setShowEmployeeSection] = useState(false);
  const [orgCode, setOrgCode] = useState('');
  const [resolvedOrg, setResolvedOrg] = useState(null);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.profile?.displayName || '',
      email: user?.profile?.email || ''
    }
  });

  const resolveOrg = useMutation({
    mutationFn: (code) => resolveOrganizationByCode(code),
    onSuccess: (data) => {
      setResolvedOrg(data.data);
      push(`Organization found: ${data.data.name}`, { tone: 'info' });
    },
    onError: (err) => push(err?.response?.data?.message || 'Organization code not found.', { tone: 'error' })
  });

  const saveProfile = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await refreshUser();
      push('Profile updated.', { tone: 'success' });
    },
    onError: (err) => push(err?.response?.data?.message || 'Profile could not be saved.', { tone: 'error' })
  });

  const verification = useMutation({
    mutationFn: submitVerificationRequest,
    onSuccess: async () => {
      await refreshUser();
      push('Membership request submitted for administrator review.', { tone: 'success' });
      setOrgCode('');
      setResolvedOrg(null);
    },
    onError: (err) => push(err?.response?.data?.message || 'Request could not be submitted.', { tone: 'error' })
  });

  const submitVerification = (event) => {
    event.preventDefault();
    verification.mutate(new FormData(event.currentTarget));
  };

  const verificationStatus = user?.officerVerification?.status || 'none';
  const displayName = user?.profile?.displayName || '';
  const wallet = user?.walletAddress || '';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile & access"
        subtitle="Your identity on DEMS and the organization memberships attached to it."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="section-card">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-[15px] font-semibold text-brand">
                {initials(displayName, wallet)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-ink">{displayName || 'Unnamed account'}</p>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">{user?.profile?.email || 'No email yet'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <RoleBadge role={user?.role} />
                  <StatusBadge status={verificationStatus} />
                </div>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <div>
                <dt className="detail-label">Wallet address</dt>
                <dd className="mt-1"><HashValue value={wallet} compact /></dd>
              </div>
              <div>
                <dt className="detail-label">Member since</dt>
                <dd className="detail-value">{formatDate(user?.createdAt)}</dd>
              </div>
              <div>
                <dt className="detail-label">Email verified</dt>
                <dd className="detail-value">
                  {user?.profile?.emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-success"><Check size={13} /> Verified</span>
                  ) : (
                    <span className="text-warn">Not verified</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="detail-label">Organization</dt>
                <dd className="detail-value">{user?.organizationId ? 'Assigned' : 'Personal account'}</dd>
              </div>
            </dl>
          </section>

          <form
            className="section-card"
            onSubmit={form.handleSubmit((values) => saveProfile.mutate(values))}
          >
            <h2 className="section-title">Personal details</h2>
            <p className="section-subtitle">Shown to your organization administrators</p>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="label">Display name</span>
                <input className="input" {...form.register('displayName')} />
                {form.formState.errors.displayName ? (
                  <span className="mt-1 block text-[12px] text-danger">{form.formState.errors.displayName.message}</span>
                ) : null}
              </label>

              <label className="block">
                <span className="label">Email</span>
                <input className="input" type="email" {...form.register('email')} />
                {form.formState.errors.email ? (
                  <span className="mt-1 block text-[12px] text-danger">{form.formState.errors.email.message}</span>
                ) : null}
              </label>
            </div>

            <button type="submit" className="btn-primary mt-4" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {saveProfile.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>

        <section className="section-card self-start">
          <button
            type="button"
            onClick={() => setShowEmployeeSection((current) => !current)}
            aria-expanded={showEmployeeSection}
            className="flex w-full items-start justify-between gap-3 text-left"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-surface text-ink-muted">
                <Briefcase size={16} />
              </span>
              <div>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">Employee membership</span>
                  <StatusBadge status={verificationStatus} />
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-5 text-ink-muted">
                  Optional: join an organization to upload files under its policy.
                </span>
              </div>
            </div>
            <ChevronDown size={15} className={`mt-1 shrink-0 text-ink-faint transition ${showEmployeeSection ? 'rotate-180' : ''}`} />
          </button>

          {showEmployeeSection ? (
            <div className="mt-5 border-t border-line pt-4">
              {verificationStatus === 'approved' ? (
                <div className="alert-success">
                  <Check size={15} className="mt-0.5 shrink-0" />
                  <span>You are an approved employee of an organization.</span>
                </div>
              ) : verificationStatus === 'pending' ? (
                <div className="alert-warn">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <span>Your application is pending administrator review.</span>
                </div>
              ) : verificationStatus === 'rejected' ? (
                <div className="alert-danger">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p>Your application was rejected.</p>
                    <p className="mt-1 text-[12px]">
                      Reason: {user?.officerVerification?.rejectionReason || 'No reason provided'}
                    </p>
                  </div>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={submitVerification}>
                  <p className="text-[13px] leading-6 text-ink-muted">
                    Enter the organization code provided by your administrator to request membership.
                  </p>

                  <div>
                    <span className="label">Organization code</span>
                    <div className="flex gap-2">
                      <input
                        className="input"
                        value={orgCode}
                        onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
                        placeholder="DEMS-XXXXX"
                        maxLength={8}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => orgCode && resolveOrg.mutate(orgCode)}
                        disabled={!orgCode || resolveOrg.isPending}
                      >
                        {resolveOrg.isPending ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                        Find
                      </button>
                    </div>
                  </div>

                  {resolvedOrg ? (
                    <div className="alert-success">
                      <Check size={15} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">{resolvedOrg.name}</p>
                        <p className="text-[12px]">Code {resolvedOrg.organizationCode}</p>
                      </div>
                    </div>
                  ) : null}

                  <input type="hidden" name="organizationId" value={resolvedOrg?._id || ''} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="label">Government ID number</span>
                      <input className="input" name="governmentIdNumber" required />
                    </label>
                    <label className="block">
                      <span className="label">Aadhaar number</span>
                      <input className="input" name="aadhaarNumber" required />
                    </label>
                  </div>

                  <div className="grid gap-3">
                    <label className="block">
                      <span className="label">Badge</span>
                      <input className="input py-2" type="file" name="badge" required />
                    </label>
                    <label className="block">
                      <span className="label">Government ID</span>
                      <input className="input py-2" type="file" name="governmentId" required />
                    </label>
                    <label className="block">
                      <span className="label">Aadhaar</span>
                      <input className="input py-2" type="file" name="aadhaar" required />
                    </label>
                    <label className="block">
                      <span className="label">Supporting documents <span className="font-normal text-ink-faint">(optional)</span></span>
                      <input className="input py-2" type="file" name="supportingDocuments" multiple />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={verification.isPending || !resolvedOrg}
                  >
                    {verification.isPending ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                    {verification.isPending ? 'Submitting…' : 'Submit application'}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          <div className="mt-5 border-t border-line pt-4">
            <p className="detail-label">Session wallet</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[12.5px] text-ink-muted">
              <Wallet size={13} className="text-ink-faint" />
              {shortAddress(wallet)}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
