import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  UploadCloud,
  User,
  Wallet,
  X
} from 'lucide-react';

import { getInvitationByToken, acceptEmployeeInvitation, submitEmployeeApplication } from '../../api/invitations.js';
import { requestEmailOTP, verifyEmailOTP } from '../../api/otp.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import BrandMark from '../../components/ui/BrandMark.jsx';
import { formatDate } from '../../utils/format.js';

const STEPS = ['Invitation', 'Profile', 'Email', 'Documents', 'Submitted'];

function Shell({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-140px)] items-start justify-center py-10">
      <div className="w-full max-w-[520px]">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <div className="section-card">{children}</div>
      </div>
    </div>
  );
}

function Problem({ title, description }) {
  return (
    <Shell>
      <div className="text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
          <X size={20} />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold text-ink">{title}</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">{description}</p>
        <Link to="/auth/wallet-login" className="btn-secondary mt-5">Go to sign in</Link>
      </div>
    </Shell>
  );
}

export default function EmployeeInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, refreshUser, loginWithWallet, authStatus } = useAuth();
  const [step, setStep] = useState('view');
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  const invitationQuery = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitationByToken(token),
    enabled: Boolean(token)
  });

  const invitation = invitationQuery.data?.data;

  const acceptInvitation = useMutation({
    mutationFn: () => acceptEmployeeInvitation(token),
    onSuccess: () => {
      setError('');
      setStep('profile');
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to accept invitation')
  });

  const submitApplication = useMutation({
    mutationFn: (formData) => submitEmployeeApplication(token, formData),
    onSuccess: async () => {
      await refreshUser();
      setStep('submitted');
    },
    onError: (err) => setError(err.response?.data?.message || 'Failed to submit application')
  });

  const requestOtp = useMutation({
    mutationFn: () => requestEmailOTP(invitation.invitedEmail),
    onSuccess: () => {
      setError('');
      setOtpVerified(false);
      setStep('otp_verification');
    },
    onError: (err) => setError(err?.response?.data?.message || err.message || 'Failed to send verification code')
  });

  const verifyOtp = useMutation({
    mutationFn: () => verifyEmailOTP(invitation.invitedEmail, otp),
    onSuccess: () => {
      setError('');
      setOtpVerified(true);
      setStep('documents');
    },
    onError: (err) => setError(err?.response?.data?.message || err.message || 'Invalid verification code')
  });

  const handleConnectWallet = async () => {
    setError('');
    try {
      await loginWithWallet();
    } catch (err) {
      setError(err.message || 'Wallet connection failed.');
    }
  };

  if (!token) return <Problem title="Invalid invitation link" description="This link is missing the invitation token." />;

  if (invitationQuery.isLoading) {
    return (
      <Shell>
        <div className="space-y-3">
          <span className="skeleton block h-4 w-1/2" />
          <span className="skeleton block h-28 w-full rounded-[10px]" />
          <span className="skeleton block h-10 w-full" />
        </div>
      </Shell>
    );
  }

  if (invitationQuery.error || !invitation) {
    return (
      <Problem
        title="Invitation unavailable"
        description={invitationQuery.error?.message || 'This invitation is invalid or has expired.'}
      />
    );
  }

  const stepIndex = { view: 0, profile: 1, otp_verification: 2, documents: 3, submitted: 4 }[step] || 0;

  const stepper = (
    <ol className="mb-5 flex items-center gap-1.5" aria-label="Application progress">
      {STEPS.map((label, index) => {
        const done = index < stepIndex;
        const active = index === stepIndex;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                done ? 'bg-success text-white' : active ? 'bg-brand text-white' : 'bg-surface text-ink-faint ring-1 ring-line'
              }`}
            >
              {done ? <Check size={11} /> : index + 1}
            </span>
            <span className={`hidden text-[11px] font-medium sm:block ${active ? 'text-ink' : 'text-ink-faint'}`}>{label}</span>
            {index < STEPS.length - 1 ? <span className={`h-px flex-1 ${done ? 'bg-success/50' : 'bg-line'}`} /> : null}
          </li>
        );
      })}
    </ol>
  );

  const errorBox = error ? (
    <div className="alert-danger mt-4" role="alert">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  ) : null;

  return (
    <Shell>
      {stepper}

      {step === 'view' ? (
        <>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand">
              <Building2 size={16} />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-ink">Employee invitation</h1>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                Join <span className="font-medium text-ink">{invitation.organizationId?.name || 'an organization'}</span> as an employee.
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-2 rounded-[10px] border border-line bg-[#FBFCFD] p-3.5 text-[12.5px] sm:grid-cols-2">
            {[
              ['Organization code', invitation.organizationId?.organizationCode || '—'],
              ['Invited email', invitation.invitedEmail],
              ['Position', invitation.designation || 'Not specified'],
              ['Department', invitation.department || 'Not specified'],
              ['Employee ID', invitation.employeeId || 'Not specified'],
              ['Expires', formatDate(invitation.expiresAt)]
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</dt>
                <dd className="truncate font-medium text-ink" title={String(value)}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 rounded-[10px] border border-line p-3.5">
            <p className="text-[12.5px] font-medium text-ink">What happens next</p>
            <ol className="mt-2 space-y-1.5 text-[12.5px] leading-5 text-ink-muted">
              {[
                'Connect the wallet you want to use for this account',
                'Complete your profile information',
                'Verify your email with a one-time code',
                'Upload verification documents',
                'Submit the application for your organization admin'
              ].map((item, index) => (
                <li key={item} className="flex gap-2">
                  <span className="text-ink-faint">{index + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          {errorBox}

          {!isAuthenticated ? (
            <button
              type="button"
              onClick={handleConnectWallet}
              className="btn-primary mt-4 w-full"
              disabled={authStatus === 'connecting'}
            >
              {authStatus === 'connecting' ? <Loader2 size={15} className="animate-spin" /> : <Wallet size={15} />}
              {authStatus === 'connecting' ? 'Connecting…' : 'Connect wallet to continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => acceptInvitation.mutate()}
              className="btn-primary mt-4 w-full"
              disabled={acceptInvitation.isPending}
            >
              {acceptInvitation.isPending ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
              {acceptInvitation.isPending ? 'Accepting…' : 'Accept invitation'}
            </button>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-faint">
            <Calendar size={12} />
            Expires {formatDate(invitation.expiresAt)}
          </p>
        </>
      ) : null}

      {step === 'profile' ? (
        <>
          <h1 className="text-[18px] font-semibold text-ink">Complete your profile</h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">
            Your name is visible to your organization administrators.
          </p>

          {errorBox}

          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              if (otpVerified) {
                setStep('documents');
              } else {
                requestOtp.mutate();
              }
            }}
          >
            <label className="block">
              <span className="label">Full name</span>
              <input
                className="input"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={invitation.invitedName || 'Jane Doe'}
                required
              />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input className="input bg-[#FBFCFD] text-ink-muted" type="email" value={invitation.invitedEmail} readOnly />
              <span className="hint">A verification code is sent to this address.</span>
            </label>
            <label className="block">
              <span className="label">Phone <span className="font-normal text-ink-faint">(optional)</span></span>
              <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 000 0000" />
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('view')} className="btn-secondary flex-1">Back</button>
              <button type="submit" className="btn-primary flex-1" disabled={requestOtp.isPending}>
                {requestOtp.isPending ? 'Sending…' : otpVerified ? 'Continue' : 'Verify email'}
              </button>
            </div>
          </form>
        </>
      ) : null}

      {step === 'otp_verification' ? (
        <>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand">
              <Mail size={16} />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-ink">Verify your email</h1>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                Enter the 6-digit code sent to <span className="font-medium text-ink">{invitation.invitedEmail}</span>.
              </p>
            </div>
          </div>

          {errorBox}

          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              verifyOtp.mutate();
            }}
          >
            <label className="block">
              <span className="label">Verification code</span>
              <input
                className="input text-center font-mono text-[20px] tracking-[0.4em]"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                required
              />
            </label>
            <div className="flex items-center justify-between text-[12.5px]">
              <button type="button" onClick={() => setStep('profile')} className="text-ink-muted hover:text-ink">Back</button>
              <button type="button" onClick={() => requestOtp.mutate()} disabled={requestOtp.isPending} className="text-brand hover:underline">
                {requestOtp.isPending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={verifyOtp.isPending || otp.length !== 6}>
              {verifyOtp.isPending ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>
        </>
      ) : null}

      {step === 'documents' ? (
        <>
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand">
              <FileText size={16} />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold text-ink">Upload verification documents</h1>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                Your administrator uses these to confirm your employment.
              </p>
            </div>
          </div>

          {errorBox}

          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError('');
              const formData = new FormData(event.currentTarget);
              if (displayName) formData.append('displayName', displayName);
              if (phone) formData.append('phone', phone);
              submitApplication.mutate(formData);
            }}
          >
            <label className="block">
              <span className="label">Documents</span>
              <input className="input py-2" type="file" name="documents" multiple required />
              <span className="hint">Employment ID, government ID, or other verification documents.</span>
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep('profile')} className="btn-secondary flex-1">Back</button>
              <button type="submit" className="btn-primary flex-1" disabled={submitApplication.isPending}>
                <UploadCloud size={15} />
                {submitApplication.isPending ? 'Submitting…' : 'Submit application'}
              </button>
            </div>
          </form>
        </>
      ) : null}

      {step === 'submitted' ? (
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
            <CheckCircle2 size={24} />
          </span>
          <h1 className="mt-4 text-[18px] font-semibold text-ink">Application submitted</h1>
          <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">
            Your application was sent to <span className="font-medium text-ink">{invitation.organizationId?.name}</span>.
          </p>
          <div className="alert-warn mt-4 text-left">
            <User size={15} className="mt-0.5 shrink-0" />
            <span>
              You remain a regular user until an organization administrator approves your application.
            </span>
          </div>
          <button type="button" onClick={() => navigate('/citizen/dashboard')} className="btn-primary mt-5 w-full">
            Return to workspace
          </button>
        </div>
      ) : null}
    </Shell>
  );
}
