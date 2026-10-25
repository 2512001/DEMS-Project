import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, FolderOpen, ShieldCheck, AlertTriangle } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import FileTypeIcon from './ui/FileTypeIcon.jsx';
import EmptyState from './ui/EmptyState.jsx';
import { formatBytes, formatDate, formatRelativeTime } from '../utils/format.js';

function storageLabel(file) {
  if (file.isQuarantine) return { status: 'quarantine', label: 'Quarantine' };
  if (file.storageStatus === 'ipfs' || file.ipfsCID) return { status: 'ipfs', label: 'IPFS' };
  if (file.storageStatus === 'failed') return { status: 'failed', label: 'Failed' };
  return { status: 'not_stored', label: 'Not stored' };
}

function blockchainLabel(file) {
  if (file.blockchainStatus === 'confirmed' || file.blockchainTxHash) {
    return { status: 'confirmed', label: 'Verified' };
  }
  if (file.blockchainStatus === 'pending') return { status: 'pending_blockchain', label: 'Pending' };
  if (file.blockchainStatus === 'failed') return { status: 'failed', label: 'Failed' };
  return { status: 'not_requested', label: 'Not requested' };
}

function getVerificationStatus(file) {
  if (file.blockchainStatus === 'confirmed' || file.blockchainTxHash) {
    return { status: 'verified', label: 'Verified', icon: ShieldCheck };
  }
  if (file.blockchainStatus === 'pending' || file.status === 'pending_blockchain') {
    return { status: 'pending', label: 'Pending Verification', icon: ShieldCheck };
  }
  if (file.blockchainStatus === 'failed') {
    return { status: 'failed', label: 'Needs Review', icon: AlertTriangle };
  }
  if (file.status === 'stored_ipfs' && file.ipfsCID) {
    return { status: 'stored', label: 'Securely Stored', icon: ShieldCheck };
  }
  return { status: 'not_requested', label: 'Not Verified', icon: ShieldCheck };
}

export default function EvidenceTable({
  files = [],
  detailsBase = '/citizen/evidence',
  emptyTitle = 'No files yet',
  emptyDescription = 'Files you upload will appear here with their storage and verification status.',
  emptyAction = null,
  showGroup = false,
  showUploader = false,
  showTechnicalDetails = false
}) {
  if (!files.length) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Size</th>
              <th scope="col">Status</th>
              <th scope="col">Storage</th>
              {showTechnicalDetails ? <th scope="col">Blockchain</th> : null}
              {showTechnicalDetails ? <th scope="col">Verification</th> : null}
              {showGroup ? <th scope="col">Group</th> : null}
              {showUploader ? <th scope="col">Uploaded By</th> : null}
              <th scope="col">Uploaded</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const storage = storageLabel(file);
              const chain = blockchainLabel(file);
              const verification = getVerificationStatus(file);
              const isQuarantine = Boolean(file.isQuarantine);
              const to = isQuarantine ? '/officer/pending-reviews' : `${detailsBase}/${file._id}`;

              return (
                <tr key={file._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <FileTypeIcon mimeType={file.mimeType} fileName={file.fileName} size="sm" />
                      <div className="min-w-0">
                        <Link
                          to={to}
                          className="block max-w-[280px] truncate text-[13.5px] font-medium text-ink transition hover:text-brand"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </Link>
                        <p className="mt-0.5 text-[11.5px] text-ink-faint">
                          {file.caseId ? `Case ${file.caseId}` : 'Personal file'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-[13px] text-ink-muted">
                    {formatBytes(file.fileSize)}
                  </td>
                  <td><StatusBadge status={file.status} /></td>
                  <td><StatusBadge status={storage.status} label={storage.label} /></td>
                  {showTechnicalDetails ? <td><StatusBadge status={chain.status} label={chain.label} /></td> : null}
                  {showTechnicalDetails ? (
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={verification.status} label={verification.label} />
                      </div>
                    </td>
                  ) : null}
                  {showGroup ? (
                    <td className="text-[13px] text-ink-muted">
                      {file.groupId ? file.groupName || 'Unknown Group' : 'No group'}
                    </td>
                  ) : null}
                  {showUploader ? (
                    <td className="text-[13px] text-ink-muted">
                      {file.uploadedBy?.profile?.displayName || file.UploaderWallet?.slice(0, 8) || 'Unknown'}
                    </td>
                  ) : null}
                  <td className="whitespace-nowrap">
                    <span className="text-[13px] text-ink-muted" title={formatDate(file.createdAt)}>
                      {formatRelativeTime(file.createdAt)}
                    </span>
                  </td>
                  <td className="text-right">
                    <Link
                      to={to}
                      className="inline-flex items-center gap-1 rounded-[7px] px-2 py-1.5 text-[12.5px] font-medium text-brand transition hover:bg-brand-soft"
                      aria-label={`Open ${file.fileName}`}
                    >
                      {isQuarantine ? 'Review' : 'Open'}
                      <ArrowUpRight size={13} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {files.map((file) => {
          const storage = storageLabel(file);
          const chain = blockchainLabel(file);
          const verification = getVerificationStatus(file);
          const isQuarantine = Boolean(file.isQuarantine);
          const to = isQuarantine ? '/officer/pending-reviews' : `${detailsBase}/${file._id}`;

          return (
            <li key={file._id}>
              <Link to={to} className="block px-4 py-3.5 transition hover:bg-surface">
                <div className="flex items-start gap-3">
                  <FileTypeIcon mimeType={file.mimeType} fileName={file.fileName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{file.fileName}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">
                      {file.caseId ? `Case ${file.caseId}` : 'Personal file'} · {formatBytes(file.fileSize)} · {formatRelativeTime(file.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={file.status} />
                      <StatusBadge status={storage.status} label={storage.label} />
                      {showTechnicalDetails ? <StatusBadge status={chain.status} label={chain.label} /> : null}
                      {showTechnicalDetails ? <StatusBadge status={verification.status} label={verification.label} /> : null}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
