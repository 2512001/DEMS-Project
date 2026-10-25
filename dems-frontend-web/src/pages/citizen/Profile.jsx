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
import { apiClient } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import RoleBadge from '../../components/RoleBadge.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDate, initials } from '../../utils/format.js';

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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

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

  const sendOtp = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      push('Please enter a valid email address.', { tone: 'error' });
      return;
    }
    setOtpSending(true);
    try {
      await apiClient.post('/auth/send-email-otp', { email: newEmail });
      setOtpSent(true);
      push('OTP sent to your email. Please check your inbox.', { tone: 'success' });
    } catch (err) {
      push(err?.response?.data?.message || 'Failed to send OTP. Please try again.', { tone: 'error' });
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      push('Please enter a valid 6-digit OTP.', { tone: 'error' });
      return;
    }
    setOtpVerifying(true);
    try {
      await apiClient.post('/auth/verify-email-otp', { email: newEmail, otp });
      await refreshUser();
      push('Email updated successfully.', { tone: 'success' });
      setIsEditingEmail(false);
      setNewEmail('');
      setOtp('');
      setOtpSent(false);
    } catch (err) {
      push(err?.response?.data?.message || 'Invalid OTP. Please try again.', { tone: 'error' });
    } finally {
      setOtpVerifying(false);
    }
  };

  const cancelEmailEdit = () => {
    setIsEditingEmail(false);
    setNewEmail('');
    setOtp('');
    setOtpSent(false);
  };

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
                <dd className="mt-1"><span className="text-[13px] text-ink">Authorized wallet</span></dd>
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

          <div className="section-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="section-title">Personal details</h2>
                <p className="section-subtitle">Shown to your organization administrators</p>
              </div>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="btn-secondary text-[13px]"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={form.handleSubmit((values) => {
                saveProfile.mutate(values);
                setIsEditingProfile(false);
              })}>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="label">Display name</span>
                    <input className="input" {...form.register('displayName')} />
                    {form.formState.errors.displayName ? (
                      <span className="mt-1 block text-[12px] text-danger">{form.formState.errors.displayName.message}</span>
                    ) : null}
                  </label>

                  <div>
                    <span className="label">Email</span>
                    <div className="mt-1">
                      <p className="text-[13px] text-ink-muted">{user?.profile?.email || 'No email set'}</p>
                      <p className="mt-1 text-[11px] text-ink-faint">Email changes require OTP verification</p>
                      {!isEditingEmail ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingEmail(true)}
                          className="mt-2 btn-secondary text-[12px]"
                        >
                          Change email
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="submit" className="btn-primary" disabled={saveProfile.isPending}>
                    {saveProfile.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                    {saveProfile.isPending ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      form.reset();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="detail-label">Display name</dt>
                  <dd className="detail-value">{user?.profile?.displayName || 'Not set'}</dd>
                </div>
                <div>
                  <dt className="detail-label">Email</dt>
                  <dd className="detail-value">{user?.profile?.email || 'Not set'}</dd>
                </div>
              </dl>
            )}
          </div>

          {isEditingEmail && (
            <div className="section-card alert-info">
              <h3 className="text-[14px] font-semibold text-ink mb-3">Change email address</h3>
              <div className="space-y-3">
                <label className="block">
                  <span className="label">New email address</span>
                  <input
                    className="input"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    disabled={otpSent}
                  />
                </label>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={sendOtp}
                    className="btn-primary w-full"
                    disabled={otpSending}
                  >
                    {otpSending ? <Loader2 size={14} className="animate-spin" /> : 'Send OTP'}
                  </button>
                ) : (
                  <>
                    <label className="block">
                      <span className="label">Enter OTP</span>
                      <input
                        className="input"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={verifyOtp}
                        className="btn-primary flex-1"
                        disabled={otpVerifying}
                      >
                        {otpVerifying ? <Loader2 size={14} className="animate-spin" /> : 'Verify & Update'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEmailEdit}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                      }}
                      className="text-[12px] text-ink-muted hover:text-ink"
                    >
                      Resend OTP
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
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
            <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-muted">
              <Wallet size={13} className="text-ink-faint" />
              Connected
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
