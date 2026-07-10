import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function LandingPage() {
  return (  
    <section className="grid flex-1 items-center gap-6 py-10 lg:grid-cols-[1.2fr_.8fr]">
      <div className="py-10">
        <p className="mb-3 text-xs font-bold uppercase text-sky-300">Decentralized Evidence Management System</p>
        <h1 className="max-w-4xl text-6xl font-black leading-none text-slate-50 max-md:text-4xl">DEMS</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          A dark, wallet-secured evidence vault for encrypted IPFS storage, AI-assisted authenticity screening, and officer-initiated blockchain proofing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="btn-primary" to="/auth/wallet-login">Connect Wallet</Link>
          <Link className="btn-secondary" to="/public/features">View Controls</Link>
        </div>
      </div>
      <div className="panel p-6">
        <div className="grid gap-4">
          {[
            [LockKeyhole, 'No passwords', 'MetaMask nonce signatures authenticate every session.'],
            [Database, 'Encrypted IPFS custody', 'Backend stores encrypted blobs and metadata only.'],
            [Fingerprint, 'Officer proofing', 'MetaMask writes evidence proof to Sepolia.'],
            [ShieldCheck, 'JWT + RBAC', 'Citizen, officer, and admin areas are route-guarded.']
          ].map(([Icon, title, body]) => (
            <div className="section-card" key={title}>
              <Icon className="mb-3 text-sky-300" size={22} />
              <h2 className="font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
