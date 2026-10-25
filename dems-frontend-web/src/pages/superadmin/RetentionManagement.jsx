import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Shield, 
  FileText, 
  Building2, 
  Calendar,
  Play,
  X,
  Filter
} from 'lucide-react';
import { 
  getRetentionPolicies, 
  dryRunDeletion,
  listOrganizations 
} from '../../api/admin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../../utils/format.js';

const STATUS_LABELS = {
  draft: 'Draft',
  pending_admin_signature: 'Pending Admin Signature',
  pending_super_signature: 'Pending Super Admin Signature',
  authorized: 'Authorized',
  extended: 'Extended',
  scheduled: 'Scheduled',
  deleting: 'Deleting',
  deleted: 'Deleted',
  failed: 'Failed',
  blocked: 'Blocked'
};

export default function RetentionManagement() {
  const [statusFilter, setStatusFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [showDryRun, setShowDryRun] = useState(false);
  const [dryRunOrg, setDryRunOrg] = useState('');
  const [includePending, setIncludePending] = useState(false);

  const { data: policiesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['retention-policies', statusFilter, orgFilter],
    queryFn: () => getRetentionPolicies({ status: statusFilter, organizationId: orgFilter })
  });

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizations
  });

  const dryRunMutation = useMutation({
    mutationFn: () => dryRunDeletion({ organizationId: dryRunOrg, includePending }),
    onSuccess: (data) => {
      console.log('Dry run results:', data);
    }
  });

  const policies = policiesData?.data || [];
  const organizations = orgsData?.data || [];

  const hasActiveFilters = statusFilter || orgFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setOrgFilter('');
  };

  const runDryRun = () => {
    dryRunMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="Retention management"
        subtitle="Manage evidence retention policies and scheduled deletions."
        actions={
          <button
            type="button"
            onClick={() => setShowDryRun(!showDryRun)}
            className="btn-secondary"
          >
            <Play size={14} />
            Dry-run preview
          </button>
        }
      />

      {showDryRun && (
        <div className="panel overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Dry-run deletion preview</h2>
              <p className="section-subtitle">Preview which evidence would be deleted without actually deleting anything.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDryRun(false)}
              className="btn-secondary btn-sm"
            >
              <X size={13} />
              Close
            </button>
          </div>
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-ink-faint mb-1.5">Organization</label>
                <select
                  value={dryRunOrg}
                  onChange={(e) => setDryRunOrg(e.target.value)}
                  className="input"
                >
                  <option value="">All organizations</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePending}
                    onChange={(e) => setIncludePending(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-[13px] text-ink">Include pending deletion jobs</span>
                </label>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={runDryRun}
                disabled={dryRunMutation.isPending}
                className="btn-primary"
              >
                <Play size={14} />
                {dryRunMutation.isPending ? 'Running...' : 'Run dry-run'}
              </button>
            </div>

            {dryRunMutation.data && (
              <div className="mt-6 border-t border-line pt-4">
                <h3 className="section-title mb-4">Dry-run results</h3>
                <div className="grid gap-4 sm:grid-cols-4 mb-6">
                  <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
                    <p className="text-[12px] text-ink-muted">Total policies</p>
                    <p className="text-[19px] font-semibold text-ink">{dryRunMutation.data.summary.totalPolicies}</p>
                  </div>
                  <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
                    <p className="text-[12px] text-ink-muted">Due for deletion</p>
                    <p className="text-[19px] font-semibold text-ink">{dryRunMutation.data.summary.totalDue}</p>
                  </div>
                  <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
                    <p className="text-[12px] text-ink-muted">Would delete</p>
                    <p className="text-[19px] font-semibold text-success">{dryRunMutation.data.summary.wouldDeleteCount}</p>
                  </div>
                  <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
                    <p className="text-[12px] text-ink-muted">Blocked</p>
                    <p className="text-[19px] font-semibold text-danger">{dryRunMutation.data.summary.blockedCount}</p>
                  </div>
                </div>

                {dryRunMutation.data.summary.blockedCount > 0 && (
                  <div className="mb-4 rounded-[10px] border border-line bg-[#FBFCFD] p-4">
                    <h4 className="text-[13px] font-medium text-ink mb-3">Blocked reasons:</h4>
                    <div className="grid gap-2 text-[12px] text-ink-muted">
                      <span>• Not due: {dryRunMutation.data.summary.blockedReasons.notDue}</span>
                      <span>• Hash mismatch: {dryRunMutation.data.summary.blockedReasons.hashMismatch}</span>
                      <span>• Legal hold: {dryRunMutation.data.summary.blockedReasons.legalHold}</span>
                      <span>• Not authorized: {dryRunMutation.data.summary.blockedReasons.notAuthorized}</span>
                      <span>• Evidence not found: {dryRunMutation.data.summary.blockedReasons.evidenceNotFound}</span>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>File</th>
                        <th>Organization</th>
                        <th>Expiration</th>
                        <th>Would delete</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dryRunMutation.data.data.map((item) => (
                        <tr key={item.policyId}>
                          <td>
                            <p className="text-[13px] text-ink">{item.fileName}</p>
                          </td>
                          <td>
                            <p className="text-[13px] text-ink">{item.organizationName}</p>
                          </td>
                          <td>
                            <p className="text-[12.5px] text-ink-muted">{formatDate(item.expirationDate)}</p>
                          </td>
                          <td>
                            {item.wouldDelete ? (
                              <CheckCircle size={14} className="text-success" />
                            ) : (
                              <XCircle size={14} className="text-danger" />
                            )}
                          </td>
                          <td>
                            <p className="text-[12.5px] text-ink-muted">{item.reason}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-[13px] text-ink-muted">
          {policiesData?.total || 0} retention policies
        </p>

        <button
          type="button"
          onClick={() => setShowDryRun(!showDryRun)}
          className="btn-secondary btn-sm"
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[11px] text-white">Active</span>}
        </button>
      </div>

      {!showDryRun && (
        <div className="grid gap-4 border-b border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-faint mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_admin_signature">Pending Admin Signature</option>
              <option value="pending_super_signature">Pending Super Signature</option>
              <option value="authorized">Authorized</option>
              <option value="extended">Extended</option>
              <option value="scheduled">Scheduled</option>
              <option value="deleting">Deleting</option>
              <option value="deleted">Deleted</option>
              <option value="failed">Failed</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-faint mb-1.5">Organization</label>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="input"
            >
              <option value="">All organizations</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end sm:col-span-2">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={clearFilters}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={7} columns={6} />
      ) : isError ? (
        <div className="p-5">
          <div className="alert-danger">Retention policies could not be loaded.</div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No retention policies"
          description="No evidence retention policies have been created yet."
        />
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">File</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Expiration</th>
                  <th scope="col">Status</th>
                  <th scope="col">Version</th>
                  <th scope="col">Legal hold</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy._id}>
                    <td>
                      <p className="text-[13px] text-ink">{policy.evidenceSnapshot?.fileName || 'Unknown'}</p>
                    </td>
                    <td>
                      <p className="text-[13px] text-ink">{policy.organizationId?.name || 'Unknown'}</p>
                    </td>
                    <td>
                      <p className="text-[12.5px] text-ink-muted">{formatDate(policy.expirationDate)}</p>
                    </td>
                    <td>
                      <StatusBadge 
                        status={
                          policy.status === 'authorized' ? 'approved' :
                          policy.status === 'deleted' ? 'failed' :
                          policy.status === 'failed' ? 'failed' :
                          policy.status === 'blocked' ? 'failed' :
                          'pending'
                        } 
                        label={STATUS_LABELS[policy.status] || policy.status} 
                      />
                    </td>
                    <td>
                      <p className="text-[12.5px] text-ink-muted">v{policy.policyVersion}</p>
                    </td>
                    <td>
                      {policy.legalHold ? (
                        <span className="badge-danger">On hold</span>
                      ) : (
                        <span className="badge-success">No hold</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
