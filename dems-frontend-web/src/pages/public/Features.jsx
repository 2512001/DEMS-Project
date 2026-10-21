import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Brain,
  Building2,
  ClipboardList,
  Database,
  FileLock2,
  Fingerprint,
  Lock,
  Mail,
  ShieldCheck,
  Users
} from 'lucide-react';

const GROUPS = [
  {
    title: 'File security',
    items: [
      ['AES-256-GCM encryption', Lock],
      ['IPFS decentralized storage', Database],
      ['SHA-256 content hashing', Fingerprint],
      ['Blockchain integrity proofs', ShieldCheck],
      ['Decrypted preview for authorized sessions', FileLock2]
    ]
  },
  {
    title: 'Verification',
    items: [
      ['AI authenticity screening', Brain],
      ['Field-by-field integrity comparison', ClipboardList],
      ['On-chain verification on demand', ShieldCheck],
      ['Quarantine workflow for flagged files', ShieldCheck]
    ]
  },
  {
    title: 'Organization',
    items: [
      ['Role-based access control', Users],
      ['Email invitations and approvals', Mail],
      ['Organization upload policy', Building2],
      ['Audit logging', ClipboardList],
      ['Security notifications', Bell]
    ]
  }
];

export default function Features() {
  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Capabilities</p>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">
          Everything needed to store files with confidence
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-ink-muted">
          Security, storage, verification, and administration are separate controls. You can adopt
          them independently and understand exactly what each one guarantees.
        </p>
      </div>

      <div className="mt-9 grid gap-4 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <section key={group.title} className="section-card">
            <h2 className="section-title">{group.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {group.items.map(([label, Icon]) => (
                <li key={label} className="flex items-start gap-2.5">
                  <Icon size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                  <span className="text-[13px] leading-6 text-ink-muted">{label}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-card border border-line bg-card p-6 shadow-card">
        <h2 className="text-[16px] font-semibold text-ink">What each layer guarantees — and what it does not</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-[13px] font-medium text-ink">Encryption</dt>
            <dd className="mt-1 text-[12.5px] leading-5 text-ink-muted">
              Keeps content confidential. Applied by DEMS, not by the storage network.
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-ink">Decentralized storage</dt>
            <dd className="mt-1 text-[12.5px] leading-5 text-ink-muted">
              Keeps content addressable and retrievable. It does not provide confidentiality.
            </dd>
          </div>
          <div>
            <dt className="text-[13px] font-medium text-ink">Blockchain proof</dt>
            <dd className="mt-1 text-[12.5px] leading-5 text-ink-muted">
              Proves integrity and time of record. It does not hide file contents.
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8">
        <Link to="/auth/wallet-login" className="btn-primary">
          Sign in to get started
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
