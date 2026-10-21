import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  Building2,
  Check,
  Database,
  Fingerprint,
  Lock,
  ShieldCheck,
  Users
} from 'lucide-react';

const CAPABILITIES = [
  {
    icon: Lock,
    title: 'Encrypted storage',
    body: 'Every file is sealed with AES-256-GCM before it is stored. Encryption keys never leave the platform.'
  },
  {
    icon: Database,
    title: 'Decentralized files',
    body: 'Encrypted content is addressed on IPFS, so the file itself can be retrieved by its content identifier.'
  },
  {
    icon: Fingerprint,
    title: 'Verifiable integrity',
    body: 'An on-chain hash proves a file has not changed. Anyone with access can verify it independently.'
  },
  {
    icon: Brain,
    title: 'Authenticity screening',
    body: 'Optional AI analysis flags potential manipulation before a file is trusted.'
  },
  {
    icon: Building2,
    title: 'Organizations',
    body: 'Group employees, apply upload policy, and review flagged files with a clear workflow.'
  },
  {
    icon: Users,
    title: 'Role-based access',
    body: 'Users, employees, and administrators only see what their role permits.'
  }
];

const STEPS = [
  ['Upload', 'Select a file and capture its context'],
  ['Encrypt', 'AES-256-GCM is applied before storage'],
  ['Store', 'Encrypted content is addressed on IPFS'],
  ['Verify', 'An integrity hash can be recorded on-chain']
];

export default function LandingPage() {
  return (
    <div className="py-12 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_minmax(0,420px)] lg:gap-16">
        <div>
          <span className="badge-brand">
            <ShieldCheck size={11} />
            Secure cloud storage
          </span>
          <h1 className="mt-4 max-w-xl text-[34px] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[44px]">
            Your files, private by default and verifiable by design.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-ink-muted">
            DEMS is a secure file vault for organizations and individuals. Files are encrypted before
            storage, kept on decentralized infrastructure, and integrity can be proven without trusting
            the application.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link to="/auth/wallet-login" className="btn-primary">
              Connect wallet
              <ArrowRight size={15} />
            </Link>
            <Link to="/public/features" className="btn-secondary">
              Explore capabilities
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
            {['No passwords', 'Role-based access', 'Audit trail'].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[12.5px] text-ink-muted">
                <Check size={13} className="text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel overflow-hidden">
          <div className="card-header">
            <div>
              <p className="text-[13px] font-semibold text-ink">Upload pipeline</p>
              <p className="text-[12px] text-ink-faint">What happens to a file</p>
            </div>
            <span className="badge-success">
              <span className="dot bg-success" />
              Protected
            </span>
          </div>
          <ol className="divide-y divide-line">
            {STEPS.map(([title, body], index) => (
              <li key={title} className="flex items-start gap-3 px-5 py-3.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[13px] font-medium text-ink">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-5 text-ink-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="border-t border-line bg-[#FBFCFD] px-5 py-3">
            <p className="text-[11.5px] leading-5 text-ink-faint">
              Encryption, decentralized storage, and integrity verification are separate guarantees —
              each can be enabled independently.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="max-w-xl">
          <p className="eyebrow">Capabilities</p>
          <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-ink">
            Built for files that need to be trusted
          </h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="section-card">
                <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-brand-soft text-brand">
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                <h3 className="mt-3 text-[14px] font-medium text-ink">{item.title}</h3>
                <p className="mt-1 text-[13px] leading-6 text-ink-muted">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14 rounded-card border border-line bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
              Ready to secure your first file?
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-muted">
              Sign in with a wallet. No account forms, no passwords.
            </p>
          </div>
          <Link to="/auth/wallet-login" className="btn-primary shrink-0">
            Get started
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </div>
  );
}
