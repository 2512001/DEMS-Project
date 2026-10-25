import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, UserCog, Filter, X } from 'lucide-react';
import { getAuditLogs } from '../../api/admin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    result: '',
    startDate: '',
    endDate: ''
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => getAuditLogs(filters)
  });
  const logs = data?.data || [];
  const total = data?.total || 0;

  const applyFilters = () => {
    refetch();
  };

  const clearFilters = () => {
    setFilters({ action: '', result: '', startDate: '', endDate: '' });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Audit log"
        subtitle="Every security-relevant action recorded for your organization."
        actions={
          <button
            type="button"
            className={`btn-secondary ${hasActiveFilters ? 'text-brand border-brand' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={15} />
            {hasActiveFilters ? 'Filters active' : 'Filter'}
          </button>
        }
      />

      {showFilters && (
        <div className="section-card">
          <h3 className="section-title">Filter logs</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="label">Action</span>
              <select
                className="input"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              >
                <option value="">All actions</option>
                <option value="upload">Upload</option>
                <option value="ipfs_storage">IPFS Storage</option>
                <option value="quarantine">Quarantine</option>
                <option value="employee_approval">Employee Approval</option>
                <option value="employee_rejection">Employee Rejection</option>
                <option value="membership_application_review">Membership Review</option>
                <option value="blockchain_transaction">Blockchain Transaction</option>
                <option value="evidence_access">Evidence Access</option>
                <option value="group_created">Group Created</option>
                <option value="group_member_added">Member Added</option>
                <option value="group_member_removed">Member Removed</option>
                <option value="invitation_created">Invitation Created</option>
                <option value="invitation_accepted">Invitation Accepted</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Result</span>
              <select
                className="input"
                value={filters.result}
                onChange={(e) => setFilters({ ...filters, result: e.target.value })}
              >
                <option value="">All results</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Start date</span>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">End date</span>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={applyFilters}
            >
              Apply filters
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary"
                onClick={clearFilters}
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

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
                        <span className="text-[13px] text-ink">Recorded</span>
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
