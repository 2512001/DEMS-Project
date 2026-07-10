import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import HashValue from '../HashValue.jsx';
import { formatDate } from '../../utils/format.js';
import VerificationStatusBadge from './VerificationStatusBadge.jsx';
import VerificationComparisonTable, { MatchIndicator } from './VerificationComparisonTable.jsx';

export default function VerificationResultCard({ result }) {
  if (!result) {
    return null;
  }

  const isVerified = result.verificationStatus === 'VERIFIED';
  const { blockchainData, comparisons, mismatches, message, verifiedAt } = result;

  if (isVerified) {
    return (
      <div className="section-card border-emerald-400/30 bg-emerald-400/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={28} className="mt-0.5 shrink-0 text-emerald-300" />
            <div>
              <h3 className="text-xl font-bold text-emerald-200">
                Blockchain Verified
              </h3>
              <p className="mt-1 text-sm text-emerald-100/80">{message}</p>
            </div>
          </div>

          <VerificationStatusBadge status={result.verificationStatus} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <MatchIndicator matched={comparisons?.hashMatched} label="Hash Match" />
          <MatchIndicator matched={comparisons?.cidMatched} label="CID Match" />
          <MatchIndicator matched={comparisons?.generatedHashMatched} label="Generated Hash Match" />
          <MatchIndicator matched={comparisons?.uploaderMatched} label="Uploader Match" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="border border-slate-800 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase text-slate-400">Verification Status</p>
            <p className="mt-2 text-sm font-semibold text-white">{result.verificationStatus}</p>
          </div>

          <div className="border border-slate-800 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase text-slate-400">Verification Time</p>
            <p className="mt-2 text-sm font-semibold text-white">{formatDate(verifiedAt)}</p>
          </div>

          <div className="border border-slate-800 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase text-slate-400">Blockchain Upload Time</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {formatDate(blockchainData?.uploadedAt)}
            </p>
          </div>

          <div className="border border-slate-800 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase text-slate-400">Wallet Address</p>
            <div className="mt-2">
              <HashValue value={blockchainData?.uploadedBy} compact={false} />
            </div>
          </div>

          <div className="border border-slate-800 bg-black/20 p-4 md:col-span-2">
            <p className="text-xs font-medium uppercase text-slate-400">Transaction Hash</p>
            <div className="mt-2">
              <HashValue value={blockchainData?.transactionHash} compact={false} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card border-red-400/30 bg-red-400/5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle size={28} className="mt-0.5 shrink-0 text-red-300" />
          <div>
            <h3 className="text-xl font-bold text-red-200">
              Evidence Integrity Failed
            </h3>
            <p className="mt-1 text-sm text-red-100/80">{message}</p>
          </div>
        </div>

        <VerificationStatusBadge status={result.verificationStatus} />
      </div>

      <VerificationComparisonTable mismatches={mismatches} />

      {blockchainData ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="border border-slate-800 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase text-slate-400">Verification Time</p>
            <p className="mt-2 text-sm font-semibold text-white">{formatDate(verifiedAt)}</p>
          </div>

          <div className="border border-slate-800 bg-black/20 p-4">
            <p className="text-xs font-medium uppercase text-slate-400">Blockchain Upload Time</p>
            <p className="mt-2 text-sm font-semibold text-white">
              {formatDate(blockchainData?.uploadedAt)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
