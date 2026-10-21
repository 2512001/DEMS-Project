import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { listModificationRequests } from '../../api/admin.js';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { CardsSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate } from '../../utils/format.js';

export default function AdminModifications() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['modifications'],
    queryFn: listModificationRequests
  });

  const requests = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Modification requests"
        subtitle="Employees cannot overwrite stored files directly. Requests are reviewed here before any metadata change is applied."
      />

      {isLoading ? (
        <CardsSkeleton count={3} />
      ) : isError ? (
        <div className="section-card">
          <div className="alert-danger">Modification requests could not be loaded.</div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No modification requests"
          description="When an employee requests a change to stored file metadata, it appears here for review."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((item) => (
            <section key={item._id} className="section-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">
                    {item.evidenceId?.fileName || 'Unknown file'}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                    {item.changeReason || 'No reason provided.'}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-faint">{formatDate(item.createdAt)}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              {item.proposedCaseId ? (
                <p className="mt-3 text-[12.5px] text-ink-muted">
                  Proposed case ID: <span className="font-mono text-ink">{item.proposedCaseId}</span>
                </p>
              ) : null}

              {item.status === 'pending' ? (
                <p className="mt-3 text-[12.5px] text-ink-faint">
                  Review this request from the file's detail page or the API workflow.
                </p>
              ) : item.adminDecisionReason ? (
                <p className="mt-3 text-[12.5px] text-ink-muted">
                  Decision: {item.adminDecisionReason}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
