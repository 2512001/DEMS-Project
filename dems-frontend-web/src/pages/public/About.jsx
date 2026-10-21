import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Fingerprint, Lock, ShieldCheck } from 'lucide-react';

const PRINCIPLES = [
  {
    icon: Lock,
    title: 'Encryption is applied by DEMS',
    body: 'Files are encrypted with AES-256-GCM before storage. Decentralized storage alone does not encrypt content — the encryption happens here.'
  },
  {
    icon: Database,
    title: 'Storage is decentralized',
    body: 'Encrypted content is addressed by a content identifier on IPFS, making it retrievable without a single central file server.'
  },
  {
    icon: Fingerprint,
    title: 'Integrity is independently verifiable',
    body: 'A cryptographic hash recorded on-chain proves a file has not changed. It proves integrity, not confidentiality.'
  },
  {
    icon: ShieldCheck,
    title: 'Identity is wallet-based',
    body: 'Authentication uses a signed one-time message. DEMS never sees or stores a private key.'
  }
];

export default function About() {
  return (
    <div className="mx-auto max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">About DEMS</p>
      <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">
        Secure file management without the usual trade-offs
      </h1>
      <p className="mt-4 text-[15px] leading-7 text-ink-muted">
        DEMS keeps identity, metadata, encrypted content, authenticity screening, and integrity proofs
        as separate layers. Each layer has one job, which makes the system easier to reason about and
        easier to audit.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="section-card">
              <span className="grid h-9 w-9 place-items-center rounded-[9px] bg-brand-soft text-brand">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <h2 className="mt-3 text-[14px] font-medium text-ink">{item.title}</h2>
              <p className="mt-1 text-[13px] leading-6 text-ink-muted">{item.body}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 section-card">
        <h2 className="section-title">How verification works</h2>
        <ol className="mt-3 space-y-2.5">
          {[
            'When a file is stored, its SHA-256 hash is computed from the original content.',
            'The encrypted blob is uploaded to IPFS and addressed by its CID.',
            'The hash, CID, uploader, and file identifier are written on-chain by your wallet.',
            'Verification re-reads all three sources and compares them field by field.'
          ].map((step, index) => (
            <li key={step} className="flex items-start gap-2.5 text-[13px] leading-6 text-ink-muted">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface text-[10.5px] font-semibold text-ink-muted">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 flex flex-wrap gap-2.5">
        <Link to="/auth/wallet-login" className="btn-primary">
          Sign in
          <ArrowRight size={15} />
        </Link>
        <Link to="/public/features" className="btn-secondary">View capabilities</Link>
      </div>
    </div>
  );
}
