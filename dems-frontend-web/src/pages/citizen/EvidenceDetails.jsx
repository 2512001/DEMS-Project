import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

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

function InfoCard({ label, value }) {
  return (
    <div className="section-card">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-2 break-all text-sm font-medium text-white">
        {value || 'N/A'}
      </p>
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

  console.log(evidence);

  if (isLoading) {
    return (
      <div className="section-card">
        Loading evidence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-card text-red-500">
        Failed to load evidence
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="section-card text-slate-400">
        Evidence not found
      </div>
    );
  }

  const fileUrl = `data:${evidence.mimeType};base64,${evidence.fileContent}`;

  return (
    <div className="grid gap-6">

      {/* Header */}

      <div className="section-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

          <div>
            <h1 className="text-2xl font-extrabold">
              {evidence.fileName}
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Uploaded on {formatDate(evidence.createdAt)}
            </p>
          </div>

          <StatusBadge status={evidence.status} />
        </div>
      </div>

      {/* Preview */}

      {evidence.mimeType?.startsWith('image/') && (
        <div className="section-card">

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Evidence Preview
            </h2>

            <a
              href={fileUrl}
              download={evidence.fileName}
              className="btn-primary"
            >
              Download
            </a>
          </div>

          <Zoom>
            <img
              src={fileUrl}
              alt={evidence.fileName}
              className="max-h-[700px] w-full cursor-zoom-in rounded-xl object-contain"
            />
          </Zoom>

        </div>
      )}

      {/* PDF Preview */}

      {evidence.mimeType === 'application/pdf' && (
        <div className="section-card">

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold">
              PDF Preview
            </h2>

            <a
              href={fileUrl}
              download={evidence.fileName}
              className="btn-primary"
            >
              Download
            </a>
          </div>

         <div className="h-[100px] flex items-center justify-center overflow-hidden rounded-xl border">
  <img
    src={fileUrl}
    alt={evidence.fileName}
    className="h-full w-auto object-contain rounded-xl"
  />
</div>

        </div>
      )}

      {/* Details */}

      <div>

        <h2 className="mb-4 text-xl font-bold">
          Evidence Details
        </h2>

        <div className="grid gap-4 md:grid-cols-2">

          <InfoCard
            label="Evidence ID"
            value={evidence._id}
          />

          <InfoCard
            label="Case ID"
            value={evidence.caseId}
          />

          <InfoCard
            label="File Name"
            value={evidence.fileName}
          />

          <InfoCard
            label="File Type"
            value={evidence.mimeType}
          />

          <InfoCard
            label="File Size"
            value={`${(
              evidence.fileSize / 1024
            ).toFixed(2)} KB`}
          />

          <InfoCard
            label="Status"
            value={evidence.status}
          />

          <InfoCard
            label="Created At"
            value={formatDate(evidence.createdAt)}
          />

          <div className="section-card">
            <p className="text-xs font-medium text-slate-400">
              IPFS CID
            </p>

            <div className="mt-2">
              <HashValue
                value={evidence.ipfsCID}
                compact={false}
              />
            </div>
          </div>

        </div>

      </div>

      {/* Blockchain Verification */}

      <div className="section-card">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Blockchain Integrity Verification</h2>
          <p className="mt-1 text-sm text-slate-400">
            Verify that this evidence matches its immutable on-chain record by comparing
            MongoDB metadata, IPFS content, and blockchain proofs.
          </p>
        </div>

        <VerificationButton
          onVerify={() => verifyMutation.mutate()}
          isLoading={verifyMutation.isPending}
          loadingMessage={VERIFICATION_LOADING_MESSAGES[loadingMessageIndex]}
        />

        {verificationError ? (
          <div className="mt-4 border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-200">
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
  );
}