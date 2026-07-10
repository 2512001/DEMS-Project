import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';

export default function EvidenceVault() {

  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['my-files', page],
    queryFn: () => getMyFiles(page, 5),
    placeholderData: (prev) => prev
  });

  const files = query.data?.data || [];

  return (
    <div className="grid gap-4">

      <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold">
            Evidence Vault
          </h1>

          <p className="text-sm text-slate-400">
            Backend source: GET /api/evidence/my-files
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCcw
            className={query.isFetching ? 'animate-spin' : ''}
            size={16}
          />
          Refresh
        </button>
      </div>

      <EvidenceTable files={files} />

      <div className="flex items-center gap-4">

        <button
          className="btn-secondary"
          disabled={!query.data?.pagination?.hasPrevPage}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>

        <span>
          Page {query.data?.pagination?.page || 1}
          {' / '}
          {query.data?.pagination?.totalPages || 1}
        </span>

        <button
          className="btn-primary"
          disabled={!query.data?.pagination?.hasNextPage}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>

      </div>

    </div>
  );
}