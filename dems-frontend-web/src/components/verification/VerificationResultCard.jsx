import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Link2,
  Shield,
  User,
  Fingerprint,
  CreditCard,
  Clock3,
  AlertTriangle,
  ExternalLink,
  Copy,
  Lock,
  Database,
  Hash,
  Globe
} from 'lucide-react';

import { formatDate } from '../../utils/format.js';
import VerificationStatusBadge from './VerificationStatusBadge.jsx';
import VerificationComparisonTable from './VerificationComparisonTable.jsx';

function explorerBase() {
  const chainId = Number(import.meta.env.VITE_REQUIRED_CHAIN_ID || 31337);
  if (chainId === 11155111) return 'https://sepolia.etherscan.io';
  if (chainId === 1) return 'https://etherscan.io';
  return null;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}

function HeroBanner({ isVerified, blockchainData, verifiedAt, message }) {
  const [copiedTx, setCopiedTx] = useState(false);
  const explorer = explorerBase();

  const handleCopyTx = () => {
    copyToClipboard(blockchainData?.transactionHash || '');
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  if (isVerified) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-slate-900/40 backdrop-blur-xl shadow-2xl shadow-emerald-500/20">
        <div className="relative px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 p-4 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={48} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold text-emerald-200">
                    INTEGRITY VERIFIED
                  </h2>
                  <VerificationStatusBadge status="VERIFIED" />
                </div>
                <p className="mt-2 text-base text-emerald-300/80">
                  {message || 'MongoDB metadata, IPFS content, and the blockchain proof match.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock3 size={16} />
                <span>Verified: {formatDate(verifiedAt)}</span>
              </div>

              {blockchainData?.transactionHash ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2 border border-slate-700/50">
                    <Fingerprint size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-300 font-mono">
                      {blockchainData.transactionHash.slice(0, 10)}...{blockchainData.transactionHash.slice(-8)}
                    </span>
                  </div>
                  <button
                    onClick={handleCopyTx}
                    className="flex items-center justify-center rounded-lg bg-slate-700/50 p-2 transition-all hover:bg-slate-600/50"
                    title="Copy transaction hash"
                  >
                    {copiedTx ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} className="text-slate-400" />}
                  </button>
                  {explorer ? (
                    <a
                      href={`${explorer}/tx/${blockchainData.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-lg bg-emerald-500/20 p-2 transition-all hover:bg-emerald-500/30"
                      title="View on explorer"
                    >
                      <ExternalLink size={16} className="text-emerald-400" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 via-red-900/20 to-slate-900/40 backdrop-blur-xl shadow-2xl shadow-red-500/20">
      <div className="relative px-8 py-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/30 to-red-600/20 p-4 shadow-lg shadow-red-500/30">
            <AlertTriangle size={48} className="text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-red-200">
                INTEGRITY FAILURE
              </h2>
              <VerificationStatusBadge status="TAMPERED" />
            </div>
            <p className="mt-2 text-base text-red-300/80">
              {message || 'Possible evidence mismatch detected.'}
            </p>
            <p className="mt-1 text-sm text-slate-400">Verified: {formatDate(verifiedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, matched }) {
  const color = matched ? 'emerald' : 'red';
  const config = {
    emerald: {
      border: 'border-emerald-500/30',
      bg: 'from-emerald-500/10 to-emerald-600/5',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      statusBg: 'bg-emerald-500/10',
      statusText: 'text-emerald-300'
    },
    red: {
      border: 'border-red-500/30',
      bg: 'from-red-500/10 to-red-600/5',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      statusBg: 'bg-red-500/10',
      statusText: 'text-red-300'
    }
  }[color];

  return (
    <div className={`rounded-xl border ${config.border} bg-gradient-to-br ${config.bg} p-5 backdrop-blur-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center rounded-xl ${config.iconBg} p-3`}>
            <Icon size={24} className={config.iconColor} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-1 text-lg font-bold ${config.statusText}`}>{matched ? 'MATCH' : 'MISMATCH'}</p>
          </div>
        </div>
        <div className={`flex items-center justify-center rounded-full ${config.statusBg} px-3 py-1.5`}>
          {matched ? (
            <CheckCircle2 size={16} className={config.iconColor} />
          ) : (
            <XCircle size={16} className={config.iconColor} />
          )}
        </div>
      </div>
    </div>
  );
}

function SecurityScore({ comparisons, checks }) {
  const checkList = checks?.length
    ? checks.map((check) => check.matched)
    : [
        comparisons?.hashesAligned ?? (comparisons?.hashMatched && comparisons?.generatedHashMatched),
        comparisons?.cidMatched,
        comparisons?.uploaderMatched,
        comparisons?.evidenceIdMatched
      ];

  const passed = checkList.filter(Boolean).length;
  const total = checkList.length || 1;
  const score = Math.round((passed / total) * 100);
  const isPerfect = score === 100;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm">
      <div className="relative px-6 py-6">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center rounded-2xl ${isPerfect ? 'bg-emerald-500/20' : 'bg-amber-500/20'} p-3`}>
              <Shield size={32} className={isPerfect ? 'text-emerald-400' : 'text-amber-400'} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Integrity score</h3>
              <p className="text-sm text-slate-400">
                {isPerfect ? 'All integrity checks passed' : `${total - passed} check(s) failed`}
              </p>
            </div>
          </div>
          <div className={`text-4xl font-bold ${isPerfect ? 'text-emerald-400' : 'text-amber-400'}`}>
            {score}
            <span className="text-sm text-slate-500"> / 100</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ icon: Icon, label, value, copyable = false, explorerLink = null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-slate-700/50 p-2">
            <Icon size={16} className="text-slate-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 break-all text-sm font-medium text-white">{value || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {copyable && value ? (
            <button
              onClick={handleCopy}
              className="flex items-center justify-center rounded-lg bg-slate-700/50 p-1.5"
              title="Copy"
            >
              {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
            </button>
          ) : null}
          {explorerLink ? (
            <a
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-lg bg-sky-500/20 p-1.5"
              title="View on explorer"
            >
              <ExternalLink size={14} className="text-sky-400" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionDivider({ title, icon: Icon }) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-lg bg-slate-700/50 p-2">
          <Icon size={18} className="text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
    </div>
  );
}

export default function VerificationResultCard({ result }) {
  if (!result) {
    return null;
  }

  const isVerified = result.verificationStatus === 'VERIFIED';
  const { blockchainData, comparisons, mismatches, checks, message, verifiedAt } = result;
  const explorer = explorerBase();

  return (
    <div className="space-y-8">
      <HeroBanner
        isVerified={isVerified}
        blockchainData={blockchainData}
        verifiedAt={verifiedAt}
        message={message}
      />

      <SecurityScore comparisons={comparisons} checks={checks} />

      <div>
        <SectionDivider title="Integrity checks" icon={Shield} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard icon={Database} label="MongoDB Hash" matched={comparisons?.hashesAligned ?? comparisons?.hashMatched} />
          <KpiCard icon={Fingerprint} label="IPFS Content Hash" matched={comparisons?.hashesAligned ?? comparisons?.generatedHashMatched} />
          <KpiCard icon={Lock} label="Blockchain Hash" matched={comparisons?.hashesAligned ?? comparisons?.hashMatched} />
          <KpiCard icon={Link2} label="IPFS CID" matched={comparisons?.cidMatched} />
          <KpiCard icon={User} label="Uploader" matched={comparisons?.uploaderMatched} />
          <KpiCard icon={Hash} label="Evidence ID" matched={comparisons?.evidenceIdMatched} />
        </div>
      </div>

      <div>
        <SectionDivider title="Source comparison" icon={AlertTriangle} />
        <VerificationComparisonTable checks={checks} mismatches={mismatches} />
      </div>

      {blockchainData ? (
        <div>
          <SectionDivider title="Blockchain proof" icon={Lock} />
          <div className="grid gap-3 md:grid-cols-2">
            <PropertyCard icon={CheckCircle2} label="Status" value={result.verificationStatus} />
            <PropertyCard icon={Clock3} label="Verification Time" value={formatDate(verifiedAt)} />
            <PropertyCard icon={Clock3} label="On-chain timestamp" value={formatDate(blockchainData.uploadedAt)} />
            <PropertyCard
              icon={CreditCard}
              label="Wallet Address"
              value={blockchainData.uploadedBy}
              copyable
              explorerLink={explorer && blockchainData.uploadedBy ? `${explorer}/address/${blockchainData.uploadedBy}` : null}
            />
            <PropertyCard
              icon={Fingerprint}
              label="Transaction Hash"
              value={blockchainData.transactionHash}
              copyable
              explorerLink={explorer && blockchainData.transactionHash ? `${explorer}/tx/${blockchainData.transactionHash}` : null}
            />
            <PropertyCard icon={Globe} label="IPFS CID" value={blockchainData.ipfsCID} copyable />
          </div>
        </div>
      ) : null}
    </div>
  );
}
