import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck, User } from 'lucide-react';
import { requestEmailOTP, verifyEmailOTP } from '../../api/otp.js';
import { updateProfile } from '../../api/auth.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import BrandMark from '../../components/ui/BrandMark.jsx';

const STEPS = ['Email', 'Verify', 'Profile', 'Done'];

function Stepper({ current }) {
  return (
    <ol className="mb-6 flex items-center gap-1.5" aria-label="Setup progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1.5">
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
                done
                  ? 'bg-success text-white'
                  : active
                    ? 'bg-brand text-white'
                    : 'bg-surface text-ink-faint ring-1 ring-line'
              }`}
            >
              {done ? <Check size={11} /> : index + 1}
            </span>
            <span className={`hidden text-[11.5px] font-medium sm:block ${active ? 'text-ink' : 'text-ink-faint'}`}>
              {label}
            </span>
            {index < STEPS.length - 1 ? <span className={`h-px flex-1 ${done ? 'bg-success/50' : 'bg-line'}`} /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function EmailVerificationSetup() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const stepIndex = { email: 0, otp: 1, name: 2, complete: 3 }[step] || 0;

  const requestOtp = useMutation({
    mutationFn: () => requestEmailOTP(email),
    onSuccess: (data) => {
      setError('');
      if (data.emailVerified) {
        setStep('name');
      } else {
        setStep('otp');
        setNotice(`Code sent to ${email}.`);
      }
    },
    onError: (err) => setError(err.response?.data?.message || err.message || 'Failed to send the verification code.')
  });

  const verifyOtp = useMutation({
    mutationFn: () => verifyEmailOTP(email, otp),
    onSuccess: async () => {
      setError('');
      setStep('name');
      await refreshUser();
    },
    onError: (err) => setError(err.response?.data?.message || err.message || 'That code is not valid.')
  });

  const saveProfile = useMutation({
    mutationFn: (data) => updateProfile(data),
    onSuccess: async () => {
      setError('');
      setStep('complete');
      await refreshUser();
    },
    onError: (err) => setError(err.response?.data?.message || err.message || 'Could not save your profile.')
  });

  const shell = (children) => (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center py-8">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 flex justify-center"><BrandMark /></div>
        <div className="section-card">
          <Stepper current={stepIndex} />
          {children}
        </div>
      </div>
    </div>
  );

  const errorBox = error ? (
    <div className="alert-danger mt-4" role="alert">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  ) : null;

  if (step === 'complete') {
    return shell(
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={24} />
        </span>
        <h1 className="mt-4 text-[19px] font-semibold text-ink">You&apos;re all set</h1>
        <p className="mt-1.5 text-[13px] leading-5 text-ink-muted">
          Your profile is ready. Continue to your workspace.
        </p>
        <button
          type="button"
          className="btn-primary mt-5 w-full"
          onClick={() => {
            const role = readRoleFromStorage();
            navigate(
              role === 'super_admin' ? '/superadmin/dashboard'
                : role === 'admin' ? '/admin/dashboard'
                : role === 'officer' ? '/officer/dashboard'
                : '/citizen/dashboard'
            );
          }}
        >
          Go to workspace
        </button>
      </div>
    );
  }

  if (step === 'name') {
    return shell(
      <>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-success-soft text-success">
            <Check size={16} />
          </span>
          <div>
            <h1 className="text-[18px] font-semibold text-ink">Complete your profile</h1>
            <p className="mt-1 text-[13px] leading-5 text-ink-muted">
              <span className="font-medium text-success">Email verified.</span> Tell your organization who you are.
            </p>
          </div>
        </div>

        {errorBox}

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            if (!name || name.trim().length < 2) {
              setError('Enter your name (at least 2 characters).');
              return;
            }
            saveProfile.mutate({ displayName: name.trim(), email: email.toLowerCase() });
          }}
        >
          <label className="block">
            <span className="label">Your name</span>
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Doe" autoFocus required />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={saveProfile.isPending}>
            {saveProfile.isPending ? <Loader2 size={15} className="animate-spin" /> : <User size={15} />}
            {saveProfile.isPending ? 'Saving…' : 'Finish setup'}
          </button>
        </form>
      </>
    );
  }

  if (step === 'otp') {
    return shell(
      <>
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setOtp('');
            setError('');
          }}
          className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft size={13} />
          Change email
        </button>
        <h1 className="text-[18px] font-semibold text-ink">Check your inbox</h1>
        <p className="mt-1 text-[13px] leading-5 text-ink-muted">
          Enter the 6-digit code we sent to <span className="font-medium text-ink">{email}</span>.
        </p>

        {notice ? <div className="alert-success mt-4">{notice}</div> : null}
        {errorBox}

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError('');
            if (otp.length !== 6) {
              setError('Enter the complete 6-digit code.');
              return;
            }
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

          <button type="submit" className="btn-primary w-full" disabled={verifyOtp.isPending || otp.length !== 6}>
            {verifyOtp.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
            {verifyOtp.isPending ? 'Verifying…' : 'Verify code'}
          </button>

          <button
            type="button"
            onClick={() => requestOtp.mutate()}
            disabled={requestOtp.isPending}
            className="btn-ghost btn-sm w-full"
          >
            <RefreshCw size={13} className={requestOtp.isPending ? 'animate-spin' : ''} />
            Resend code
          </button>
        </form>
      </>
    );
  }

  return shell(
    <>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-brand-soft text-brand">
          <Mail size={16} />
        </span>
        <div>
          <h1 className="text-[18px] font-semibold text-ink">Verify your email</h1>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">
            We use your email for invitations and security notifications.
          </p>
        </div>
      </div>

      {errorBox}

      <form
        className="mt-5 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError('');
          if (!email || !email.includes('@')) {
            setError('Enter a valid email address.');
            return;
          }
          requestOtp.mutate();
        }}
      >
        <label className="block">
          <span className="label">Email address</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoFocus
            required
          />
        </label>

        <button type="submit" className="btn-primary w-full" disabled={requestOtp.isPending}>
          {requestOtp.isPending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
          {requestOtp.isPending ? 'Sending…' : 'Send verification code'}
        </button>
      </form>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-faint">
        <ShieldCheck size={12} />
        Your email is never shared with other organizations.
      </p>
    </>
  );
}

// Small helper kept local so the completion screen can route by role.
function readRoleFromStorage() {
  try {
    const raw = JSON.parse(localStorage.getItem('dems.auth') || 'null');
    return raw?.user?.role || 'citizen';
  } catch {
    return 'citizen';
  }
}
