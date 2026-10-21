import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, UserCog } from 'lucide-react';
import { getAuditLogs } from '../../api/admin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import HashValue from '../../components/HashValue.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../../utils/format.js';

const ACTION_LABELS = {
  upload: 'File uploaded',
  ipfs_storage: 'Stored on IPFS',
  quarantine: 'File quarantined',
  membership_application_review: 'Membership application reviewed',
  employee_approval: 'Employee approved',
  employee_rejection: 'Employee rejected',
  blockchain_transaction: 'Blockchain transaction',
  blockchain_failure: 'Blockchain failure',
  evidence_access: 'File accessed',
  organization_settings: 'Organization settings updated',
  invitation_created: 'Invitation created',
  invitation_accepted: 'Invitation accepted'
};

function actionLabel(action) {
  return ACTION_LABELS[action] || String(action || 'Event').replaceAll('_', ' ');
}

export default function AuditLogs() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: getAuditLogs
  });
  const logs = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        subtitle="Every security-relevant action recorded for your organization."
      />

      {isLoading ? (
        <TableSkeleton rows={7} columns={5} />
      ) : isError ? (
        <div className="section-card">
          <div className="alert-danger">Audit logs could not be loaded.</div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit events yet"
          description="Uploads, reviews, access events, and settings changes will be recorded here."
        />
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Result</th>
                  <th scope="col">Reason</th>
                  <th scope="col">When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const failed = log.result && log.result !== 'success';
                  return (
                    <tr key={log._id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${failed ? 'bg-danger' : 'bg-success'}`} />
                          <span className="text-[13px] font-medium text-ink">{actionLabel(log.action)}</span>
                        </div>
                      </td>
                      <td>
                        <HashValue value={log.actorWallet || log.targetId || log._id} compact />
                      </td>
                      <td>
                        <span className={failed ? 'badge-danger' : 'badge-success'}>
                          {log.result || 'success'}
                        </span>
                      </td>
                      <td className="max-w-[260px]">
                        <span className="block truncate text-[12.5px] text-ink-muted" title={log.reason || ''}>
                          {log.reason || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="text-[12.5px] text-ink-muted" title={formatDate(log.createdAt)}>
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="flex items-center gap-1.5 text-[11.5px] text-ink-faint">
        <UserCog size={12} />
        Audit records are append-only and cannot be edited from the interface.
      </p>
    </div>
  );
}
