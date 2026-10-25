import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HardDrive, Building2, FileType, CheckCircle, AlertTriangle, Filter, X } from 'lucide-react';
import { getStorageMonitoring, listOrganizations } from '../../api/admin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

export default function StorageMonitoring() {
  const [orgFilter, setOrgFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: storageData, isLoading, isError, refetch } = useQuery({
    queryKey: ['storage-monitoring', orgFilter],
    queryFn: () => getStorageMonitoring({ organizationId: orgFilter })
  });

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizations
  });

  const storage = storageData?.data || {};
  const organizations = orgsData?.data || [];

  const hasActiveFilters = orgFilter;

  const clearFilters = () => {
    setOrgFilter('');
  };

  const evidenceByOrg = storage.evidenceByOrg || [];
  const evidenceByType = storage.evidenceByType || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="Storage monitoring"
        subtitle="View evidence storage statistics and IPFS status across the platform."
      />

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-[13px] text-ink-muted">
          Based on available database records
        </p>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary btn-sm"
          aria-expanded={showFilters}
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[11px] text-white">Active</span>}
        </button>
      </div>

      {showFilters && (
        <div className="grid gap-4 border-b border-line px-4 py-4 sm:grid-cols-2 sm:px-5">
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
          <div className="flex items-end">
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
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
                <span className="skeleton h-5 w-8" />
                <span className="skeleton h-8 w-16 mt-2 block" />
                <span className="skeleton h-3 w-20 mt-2 block" />
              </div>
            ))}
          </div>
          <div className="p-4"><TableSkeleton rows={4} columns={3} /></div>
        </div>
      ) : isError ? (
        <div className="p-5">
          <div className="alert-danger">Storage data could not be loaded.</div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
              <HardDrive size={18} className="text-brand" />
              <p className="mt-2 text-[19px] font-semibold text-ink">{storage.totalEvidence ?? 0}</p>
              <p className="text-[12px] text-ink-muted">Total evidence records</p>
            </div>
            <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
              <CheckCircle size={18} className="text-success" />
              <p className="mt-2 text-[19px] font-semibold text-ink">{storage.ipfsStored ?? 0}</p>
              <p className="text-[12px] text-ink-muted">Stored on IPFS</p>
            </div>
            <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
              <AlertTriangle size={18} className="text-danger" />
              <p className="mt-2 text-[19px] font-semibold text-ink">{storage.ipfsRetrievalFailures ?? 0}</p>
              <p className="text-[12px] text-ink-muted">Retrieval failures</p>
            </div>
            <div className="rounded-[10px] border border-line bg-[#FBFCFD] p-4">
              <CheckCircle size={18} className="text-success" />
              <p className="mt-2 text-[19px] font-semibold text-ink">{storage.retrievalSuccessRate ?? 0}%</p>
              <p className="text-[12px] text-ink-muted">Retrieval success rate</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="panel overflow-hidden">
              <div className="card-header">
                <div>
                  <h2 className="section-title">Evidence by organization</h2>
                  <p className="section-subtitle">Distribution across organizations</p>
                </div>
              </div>
              {evidenceByOrg.length === 0 ? (
                <div className="p-5">
                  <EmptyState compact icon={Building2} title="No data" description="No evidence records found." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Organization</th>
                        <th>Code</th>
                        <th className="text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceByOrg.map((item) => (
                        <tr key={item.organizationId}>
                          <td>
                            <p className="text-[13px] text-ink">{item.organizationName}</p>
                          </td>
                          <td>
                            <p className="text-[11.5px] text-ink-f font-mono">{item.organizationCode}</p>
                          </td>
                          <td className="text-right">
                            <p className="text-[13px] font-semibold text-ink">{item.count}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel overflow-hidden">
              <div className="card-header">
                <div>
                  <h2 className="section-title">Evidence by file type</h2>
                  <p className="section-subtitle">Distribution by MIME type</p>
                </div>
              </div>
              {evidenceByType.length === 0 ? (
                <div className="p-5">
                  <EmptyState compact icon={FileType} title="No data" description="No evidence records found." />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>MIME type</th>
                        <th className="text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceByType.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <p className="text-[13px] text-ink font-mono">{item._id || 'Unknown'}</p>
                          </td>
                          <td className="text-right">
                            <p className="text-[13px] font-semibold text-ink">{item.count}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="p-4 rounded-[10px] border border-line bg-[#FBFCFD]">
            <p className="text-[12px] text-ink-muted">
              <strong>Note:</strong> These statistics are based on available database records. IPFS storage totals cannot be accurately measured from Pinata and are not displayed. Retrieval success rate is calculated from records with IPFS CIDs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
