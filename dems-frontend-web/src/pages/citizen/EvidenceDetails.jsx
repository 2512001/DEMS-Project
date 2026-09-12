import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

import {
  FileText,
  Download,
  Calendar,
  Hash,
  HardDrive,
  Fingerprint,
  Link2,
  Shield,
  Clock,
  FileImage,
  FileText as FilePdf,
  CheckCircle2,
  Copy,
  XCircle
} from 'lucide-react';

import HashValue from '../../components/HashValue.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import VerificationButton from '../../components/verification/VerificationButton.jsx';
import VerificationResultCard from '../../components/verification/VerificationResultCard.jsx';
import { formatDate } from '../../utils/format.js';
import { downloadEvidence, verifyEvidenceBlockchain } from '../../api/evidence.js';

const VERIFICATION_LOADING_MESSAGES = [
  'Verifying evidence integrity...',
  'Checking blockchain records...',
  'Comparing hashes...'
];

function DetailCard({ icon: Icon, label, value, copyable = false }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-4 backdrop-blur-sm transition-all duration-300 hover:border-slate-600/50 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-slate-700/50 p-2 transition-all duration-300 group-hover:bg-slate-600/50">
            <Icon size={16} className="text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-sm font-medium text-white break-all">{value || 'N/A'}</p>
          </div>
        </div>

        {copyable && (
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-lg bg-slate-700/50 p-1.5 transition-all hover:bg-slate-600/50 hover:scale-105"
            title="Copy"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} className="text-slate-400" />}
          </button>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-500/0 via-slate-500/5 to-slate-500/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
      <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent" />
    </div>
  );
}

export default function EvidenceDetails() {
  const { evidenceId } = useParams();
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [verificationError, setVerificationError] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['evidence', evidenceId],
    queryFn: () => downloadEvidence(evidenceId),
    enabled: !!evidenceId
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyEvidenceBlockchain(evidenceId),
    onMutate: () => {
      setVerificationError('');
    },
    onError: (err) => {
      setVerificationError(
        err.response?.data?.message || err.message || 'Verification request failed.'
      );
    }
  });

  useEffect(() => {
    if (!verifyMutation.isPending) {
      setLoadingMessageIndex(0);
      return undefined;
    }

    const interval = setInterval(() => {
      setLoadingMessageIndex((current) => (current + 1) % VERIFICATION_LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [verifyMutation.isPending]);

  const evidence = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-12 backdrop-blur-xl">
        <div className="text-center">
          <div className="flex items-center justify-center rounded-2xl bg-slate-800/50 p-4 w-fit mx-auto mb-4">
            <Clock size={48} className="text-slate-500 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Loading Evidence</h3>
          <p className="text-sm text-slate-400">Please wait while we fetch the evidence details</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/20 to-slate-900/30 p-12 backdrop-blur-xl">
        <div className="text-center">
          <div className="flex items-center justify-center rounded-2xl bg-red-500/20 p-4 w-fit mx-auto mb-4">
            <XCircle size={48} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-red-200 mb-2">Failed to Load Evidence</h3>
          <p className="text-sm text-red-300/80">An error occurred while fetching the evidence</p>
        </div>
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 p-12 backdrop-blur-xl">
        <div className="text-center">
          <div className="flex items-center justify-center rounded-2xl bg-slate-800/50 p-4 w-fit mx-auto mb-4">
            <FileText size={48} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Evidence Not Found</h3>
          <p className="text-sm text-slate-400">The requested evidence record does not exist</p>
        </div>
      </div>
    );
  }

  const fileUrl = evidence.fileContent ? `data:${evidence.mimeType};base64,${evidence.fileContent}` : '';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-transparent to-sky-500/5 opacity-50" />
        <div className="relative px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-sky-600/20 p-4 shadow-lg shadow-sky-500/30">
                {evidence.mimeType?.startsWith('image/') ? (
                  <FileImage size={48} className="text-sky-400" />
                ) : evidence.mimeType === 'application/pdf' ? (
                  <FilePdf size={48} className="text-sky-400" />
                ) : (
                  <FileText size={48} className="text-sky-400" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {evidence.fileName}
                </h1>
                <p className="mt-2 text-base text-slate-400">
                  Uploaded on {formatDate(evidence.createdAt)}
                </p>
              </div>
            </div>

            <StatusBadge status={evidence.status} />
          </div>
        </div>
      </div>

      {(evidence.fileContent && (evidence.mimeType?.startsWith('image/') || evidence.mimeType === 'application/pdf')) && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl">
          <div className="border-b border-slate-700/50 bg-slate-900/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {evidence.mimeType?.startsWith('image/') ? (
                  <FileImage size={20} className="text-slate-400" />
                ) : (
                  <FilePdf size={20} className="text-slate-400" />
                )}
                <h3 className="text-lg font-bold text-white">Evidence Preview</h3>
              </div>
              <a
                href={fileUrl}
                download={evidence.fileName}
                className="group flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 hover:shadow-lg hover:shadow-sky-500/20"
              >
                <Download size={16} />
                Download
              </a>
            </div>
          </div>
          <div className="p-6">
            {evidence.mimeType?.startsWith('image/') ? (
              <Zoom>
                <img
                  src={fileUrl}
                  alt={evidence.fileName}
                  className="max-h-[700px] w-full cursor-zoom-in rounded-xl object-contain"
                />
              </Zoom>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-slate-700/50 bg-slate-800/30 p-12">
                <div className="text-center">
                  <FilePdf size={48} className="text-slate-500 mx-auto mb-4" />
                  <p className="text-sm text-slate-400">PDF preview available on download</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evidence Details */}
      <div>
        <SectionDivider title="Evidence Details" icon={FileText} />
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard
            icon={Hash}
            label="Evidence ID"
            value={evidence._id}
            copyable
          />
          <DetailCard
            icon={Hash}
            label="Case ID"
            value={evidence.caseId || 'Personal'}
          />
          <DetailCard
            icon={FileText}
            label="File Name"
            value={evidence.fileName}
          />
          <DetailCard
            icon={HardDrive}
            label="File Type"
            value={evidence.mimeType}
          />
          <DetailCard
            icon={HardDrive}
            label="File Size"
            value={`${(evidence.fileSize / 1024).toFixed(2)} KB`}
          />
          <DetailCard
            icon={Shield}
            label="Status"
            value={evidence.status}
          />
          <DetailCard
            icon={Calendar}
            label="Created At"
            value={formatDate(evidence.createdAt)}
          />
          <DetailCard
            icon={Link2}
            label="IPFS CID"
            value={evidence.ipfsCID}
            copyable
          />
          <DetailCard
            icon={Fingerprint}
            label="SHA-256 file hash"
            value={evidence.fileHash}
            copyable
          />
          <DetailCard
            icon={Hash}
            label="Blockchain transaction"
            value={evidence.blockchainTxHash}
            copyable
          />
        </div>
      </div>

      <div>
        <SectionDivider title="AI Analysis" icon={Shield} />
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard icon={Shield} label="Requested" value={evidence.aiAnalysis?.requested ? 'Yes' : 'No'} />
          <DetailCard icon={Shield} label="Authenticity" value={`${evidence.aiAnalysis?.authenticityScore ?? evidence.aiAnalysis?.score ?? 'N/A'}`} />
          <DetailCard icon={Shield} label="Tampering" value={`${evidence.aiAnalysis?.tamperingScore ?? 'N/A'}`} />
          <DetailCard icon={Shield} label="Deepfake" value={`${evidence.aiAnalysis?.deepfakeScore ?? 'N/A'}`} />
          <DetailCard icon={Shield} label="Explanation" value={evidence.aiAnalysis?.explanation || 'AI was not requested.'} />
          <DetailCard icon={Shield} label="Model" value={evidence.aiAnalysis?.modelVersion || 'N/A'} />
        </div>
      </div>

      <div>
        <SectionDivider title="Storage and review" icon={HardDrive} />
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard icon={HardDrive} label="Storage" value={evidence.storageStatus || evidence.status} />
          <DetailCard icon={Shield} label="Review" value={evidence.reviewStatus || 'not_required'} />
          <DetailCard icon={Shield} label="Blockchain status" value={evidence.blockchainStatus || (evidence.blockchainTxHash ? 'confirmed' : 'not_requested')} />
          <DetailCard icon={Hash} label="Uploader" value={evidence.UploaderWallet} copyable />
        </div>
      </div>

      {/* Blockchain Verification */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl">
        <div className="border-b border-slate-700/50 bg-slate-900/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-slate-400" />
            <h3 className="text-lg font-bold text-white">Blockchain Integrity Verification</h3>
          </div>
        </div>
        <div className="p-6">
          <p className="mb-6 text-sm text-slate-400">
            Verify that this evidence matches its immutable on-chain record by comparing
            MongoDB metadata, IPFS content, and blockchain proofs.
          </p>

          {evidence.status === 'stored_on_chain' || evidence.blockchainTxHash ? (
            <VerificationButton
              onVerify={() => verifyMutation.mutate()}
              isLoading={verifyMutation.isPending}
              loadingMessage={VERIFICATION_LOADING_MESSAGES[loadingMessageIndex]}
            />
          ) : (
            <p className="text-sm text-amber-300/80">
              Blockchain proof was not recorded for this file, so on-chain integrity verification is unavailable.
            </p>
          )}

          {verificationError ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
              {verificationError}
            </div>
          ) : null}

          {verifyMutation.data ? (
            <div className="mt-6">
              <VerificationResultCard result={verifyMutation.data} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}