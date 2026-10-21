import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ClipboardList,
  FolderLock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  UploadCloud
} from 'lucide-react';

import { getMyFiles } from '../../api/evidence.js';
import { getOfficerAnalytics } from '../../api/analytics.js';
import { listQuarantine } from '../../api/admin.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import FileTypeIcon from '../../components/ui/FileTypeIcon.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { StatCardSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatBytes, formatRelativeTime } from '../../utils/format.js';

export default function OfficerDashboard() {
  const { user } = useAuth();

  const filesQuery = useQuery({ queryKey: ['my-files', 1, 5], queryFn: () => getMyFiles(1, 5) });
  const analytics = useQuery({ queryKey: ['analytics', 'officer'], queryFn: getOfficerAnalytics });
  const quarantine = useQuery({ queryKey: ['quarantine'], queryFn: listQuarantine });

  const files = [...(filesQuery.data?.quarantine || []), ...(filesQuery.data?.data || [])].slice(0, 5);
  const overview = analytics.data?.overview;
  const pending = (quarantine.data?.data || []).filter((item) => item.reviewStatus === 'pending_review').length;
  const loading = analytics.isLoading || filesQuery.isLoading;
  const firstName = (user?.profile?.displayName || '').split(' ')[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={firstName ? `Welcome back, ${firstName}` : 'Employee workspace'}
        title="Secure File Vault"
        subtitle="Securely store, manage, and verify your digital files."
        actions={
          <Link to="/officer/upload-evidence" className="btn-primary">
            <Plus size={15} />
            Upload File
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              icon={FolderLock}
              label="Total Files"
              value={overview?.totalEvidence ?? 0}
              detail="Files you uploaded under this organization"
              tone="brand"
            />
            <StatCard
              icon={ShieldCheck}
              label="Blockchain Verified"
              value={overview?.blockchainConfirmedEvidence ?? 0}
              detail="On-chain integrity proofs"
              tone="success"
            />
            <StatCard
              icon={ShieldAlert}
              label="Pending Review"
              value={pending}
              detail={pending > 0 ? 'Files awaiting an admin decision' : 'Nothing waiting on review'}
              tone={pending > 0 ? 'warn' : 'neutral'}
            />
            <StatCard
              icon={ClipboardList}
              label="Quarantined"
              value={overview?.quarantinedEvidence ?? quarantine.data?.data?.length ?? 0}
              detail="Isolated by AI screening"
              tone="neutral"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Recent files</h2>
              <p className="section-subtitle">Your latest uploads and review state</p>
            </div>
            <Link to="/citizen/evidence-vault" className="btn-ghost btn-sm">
              View all
              <ArrowRight size={13} />
            </Link>
          </div>

          {filesQuery.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="skeleton h-8 w-8 rounded-[8px]" />
                  <span className="skeleton h-3 flex-1" />
                  <span className="skeleton h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                icon={UploadCloud}
                title="No uploads yet"
                description="Upload a file to store it securely under your organization's policy."
                action={
                  <Link to="/officer/upload-evidence" className="btn-primary btn-sm">
                    <UploadCloud size={14} />
                    Upload File
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {files.map((file) => (
                <li key={file._id}>
                  <Link
                    to={file.isQuarantine ? '/officer/pending-reviews' : `/citizen/evidence/${file._id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface"
                  >
                    <FileTypeIcon mimeType={file.mimeType} fileName={file.fileName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{file.fileName}</p>
                      <p className="mt-0.5 text-[12px] text-ink-faint">
                        {formatBytes(file.fileSize)} · {formatRelativeTime(file.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={file.status} />
                    <ArrowRight size={14} className="hidden shrink-0 text-ink-faint sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-card">
          <h2 className="section-title">Governance</h2>
          <p className="section-subtitle">Custody and review tools</p>
          <div className="mt-4 space-y-2">
            {[
              {
                to: '/officer/pending-reviews',
                icon: ShieldAlert,
                title: 'Pending reviews',
                detail: `${pending} file${pending === 1 ? '' : 's'} awaiting a decision`
              },
              {
                to: '/officer/chain-of-custody',
                icon: ClipboardList,
                title: 'Chain of custody',
                detail: 'Blockchain-backed file history'
              },
              {
                to: '/officer/evidence-tracking',
                icon: FolderLock,
                title: 'Evidence tracking',
                detail: 'Look up files by case ID'
              },
              {
                to: '/officer/modifications',
                icon: ClipboardList,
                title: 'Modification requests',
                detail: 'Request a reviewed metadata change'
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 transition hover:border-[#d3d8e0] hover:bg-[#FBFCFD]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-surface text-ink-muted">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                    <span className="block text-[11.5px] text-ink-faint">{item.detail}</span>
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-ink-faint" />
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
