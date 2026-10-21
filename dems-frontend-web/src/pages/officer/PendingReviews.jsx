import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { listQuarantine } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import FileTypeIcon from '../../components/ui/FileTypeIcon.jsx';
import { CardsSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatBytes, formatDate, formatRelativeTime } from '../../utils/format.js';

export default function PendingReviews() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['quarantine'],
    queryFn: listQuarantine
  });

  const records = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace"
        title="Pending reviews"
        subtitle="Files you uploaded that were held for administrator review."
        meta={
          records.length > 0 ? (
            <span className="badge-warn">
              <ShieldAlert size={11} />
              {records.length} record{records.length === 1 ? '' : 's'}
            </span>
          ) : null
        }
      />

      {isLoading ? (
        <CardsSkeleton count={3} />
      ) : isError ? (
        <div className="section-card">
          <div className="alert-danger">Review records could not be loaded.</div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing pending"
          description="No files of yours are currently waiting for an administrator decision."
        />
      ) : (
        <div className="space-y-3">
          {records.map((item) => (
            <section key={item._id} className="section-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <FileTypeIcon mimeType={item.mimeType} fileName={item.fileName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">{item.fileName}</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      {formatBytes(item.fileSize)} · {item.caseId ? `Case ${item.caseId}` : 'No case'} ·{' '}
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={item.reviewStatus} />
              </div>

              {item.reviewStatus === 'rejected' && item.adminDecisionReason ? (
                <p className="alert-danger mt-3">Administrator reason: {item.adminDecisionReason}</p>
              ) : null}

              {item.reviewStatus === 'approved' && item.resultingEvidenceId ? (
                <div className="mt-3">
                  <Link to={`/citizen/evidence/${item.resultingEvidenceId}`} className="btn-secondary btn-sm">
                    Open trusted file
                  </Link>
                </div>
              ) : null}

              <p className="mt-3 text-[11.5px] text-ink-faint">Submitted {formatDate(item.createdAt)}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
