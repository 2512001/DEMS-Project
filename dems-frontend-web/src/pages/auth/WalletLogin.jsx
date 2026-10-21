import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Database, Fingerprint, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import BrandMark from '../../components/ui/BrandMark.jsx';

const CAPABILITIES = [
  { icon: Lock, title: 'Encrypted before storage', body: 'Files are sealed with AES-256-GCM before they leave the application.' },
  { icon: Database, title: 'Decentralized storage', body: 'Encrypted content is addressed by CID on IPFS.' },
  { icon: Fingerprint, title: 'Verifiable integrity', body: 'A blockchain hash proves a file has not changed.' }
];

function workspacePath(role) {
  if (role === 'super_admin') return '/superadmin/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'officer') return '/officer/dashboard';
  return '/citizen/dashboard';
}

export default function WalletLogin() {
  const navigate = useNavigate();
  const { loginWithWallet, authError, setAuthError, isAuthenticated, user } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.role) return;
    navigate(
      user.profile?.emailVerified ? workspacePath(user.role) : '/auth/email-verification',
      { replace: true }
    );
  }, [isAuthenticated, user, navigate]);

  const login = async () => {
    setBusy(true);
    setAuthError('');
    try {
      const verified = await loginWithWallet();
      if (!verified?.user) throw new Error('Authentication failed: no user data received.');
      navigate(
        verified.user.profile?.emailVerified ? workspacePath(verified.user.role) : '/auth/email-verification',
        { replace: true }
      );
    } catch (error) {
      setAuthError(error.message || 'Wallet authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-140px)] items-center gap-10 py-8 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16">
      <div className="order-2 hidden lg:order-1 lg:block">
        <BrandMark />
        <h1 className="mt-8 max-w-lg text-[34px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink">
          Secure files. Decentralized storage. Verifiable integrity.
        </h1>
        <p className="mt-4 max-w-md text-[14.5px] leading-7 text-ink-muted">
          DEMS stores and manages files for organizations and individuals without passwords. Access is
          signed by your wallet, files are encrypted, and integrity can be proven independently.
        </p>

        <ul className="mt-8 grid max-w-md gap-3">
          {CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex items-start gap-3 rounded-[10px] border border-line bg-card p-3.5 shadow-card">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-brand-soft text-brand">
                  <Icon size={15} strokeWidth={1.9} />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-5 text-ink-muted">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="order-1 mx-auto w-full max-w-[420px] lg:order-2">
        <div className="section-card">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="mt-6 flex items-start gap-3 lg:mt-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand">
              <Wallet size={18} />
            </span>
            <div>
              <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">Sign in with your wallet</h2>
              <p className="mt-1 text-[13px] leading-5 text-ink-muted">
                No password. MetaMask signs a one-time message that proves you own the wallet.
              </p>
            </div>
          </div>

          <ol className="mt-5 space-y-2.5 rounded-[10px] border border-line bg-[#FBFCFD] p-3.5">
            {[
              'DEMS requests a one-time nonce from the server.',
              'MetaMask signs the nonce with your wallet.',
              'The signature is verified and a session is issued.'
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 text-[12.5px] leading-5 text-ink-muted">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-card text-[10px] font-semibold text-ink-faint ring-1 ring-line">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          {!window.ethereum ? (
            <div className="alert-warn mt-4">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">MetaMask is required</p>
                <p className="mt-0.5">Install the browser extension, then return to this page.</p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 font-medium underline underline-offset-2"
                >
                  Install MetaMask
                  <ArrowRight size={12} />
                </a>
              </div>
            </div>
          ) : null}

          {authError ? (
            <div className="alert-danger mt-4" role="alert">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span className="flex-1">{authError}</span>
              <button type="button" className="shrink-0 font-medium underline" onClick={() => setAuthError('')}>
                Dismiss
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="btn-primary mt-5 w-full"
            onClick={login}
            disabled={busy || !window.ethereum}
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Waiting for signature…
              </>
            ) : (
              <>
                <Wallet size={15} />
                Connect MetaMask
              </>
            )}
          </button>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-faint">
            <ShieldCheck size={12} />
            DEMS never sees your private key.
          </p>
        </div>

        <p className="mt-4 text-center text-[12px] text-ink-faint">
          New accounts are created automatically on first sign-in.{' '}
          <Link to="/public/about" className="link">Learn about DEMS</Link>
        </p>
      </div>
    </div>
  );
}
