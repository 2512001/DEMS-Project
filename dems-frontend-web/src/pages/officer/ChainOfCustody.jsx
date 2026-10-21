import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Search, ShieldCheck, X } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

const CUSTODY_STATUSES = ['pending_blockchain', 'stored_on_chain'];

export default function ChainOfCustody() {
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-files', page, 'custody'],
    queryFn: () => getMyFiles(page, 20),
    placeholderData: (previous) => previous
  });

  const custodyFiles = useMemo(
    () => (data?.data || []).filter((file) => CUSTODY_STATUSES.includes(file.status)),
    [data]
  );

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return custodyFiles;
    return custodyFiles.filter((file) =>
      [file.fileName, file.caseId, file.blockchainTxHash]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [custodyFiles, term]);

  const verified = custodyFiles.filter((file) => file.status === 'stored_on_chain' || file.blockchainTxHash).length;
  const pending = custodyFiles.filter((file) => file.status === 'pending_blockchain').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Chain of custody"
        subtitle="Files with a blockchain-backed proof, and files waiting for one."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Archive} label="In custody" value={custodyFiles.length} detail="Files with a blockchain workflow" tone="brand" />
        <StatCard icon={ShieldCheck} label="Verified" value={verified} detail="On-chain proof recorded" tone="success" />
        <StatCard icon={Archive} label="Pending" value={pending} detail="Waiting for confirmation" tone={pending ? 'warn' : 'neutral'} />
      </div>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="section-title">Custody records</h2>
            <p className="section-subtitle">Only blockchain-tracked files appear here</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-8 pr-8"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search custody records"
              aria-label="Search custody records"
            />
            {term ? (
              <button
                type="button"
                onClick={() => setTerm('')}
                className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-ink-faint hover:bg-surface hover:text-ink"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={5} columns={6} /></div>
        ) : error ? (
          <div className="p-5">
            <div className="alert-danger">Custody records could not be loaded.</div>
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
          </div>
        ) : (
          <EvidenceTable
            files={visible}
            emptyTitle="No custody records"
            emptyDescription="Files with an on-chain integrity proof will appear here."
          />
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12.5px] text-ink-muted sm:px-5">
          <span>Page {data?.pagination?.page || page} of {data?.pagination?.totalPages || 1}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={!data?.pagination?.hasPrevPage}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={!data?.pagination?.hasNextPage}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
