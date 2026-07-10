import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyFiles } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';

export default function ChainOfCustody() {

  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
  queryKey: ['my-files', page],
  queryFn: () => getMyFiles(page, 5),
  placeholderData: (previousData) => previousData
});

  const files = (data?.data || []).filter(
    (file) =>
      ['pending_blockchain', 'stored_on_chain']
        .includes(file.status)
  );


  if (error) {
    return (
      <div className="text-red-500">
        Failed to load files
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }


  return (
    <div className="grid gap-4">

      <h1 className="text-2xl font-extrabold">
        Chain Of Custody
      </h1>

      <EvidenceTable
        files={files}
        detailsBase="/citizen/evidence"
      />

      <div className="flex items-center gap-4">

        <button
          disabled={!data?.pagination?.hasPrevPage}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>

        <span>
          Page {data?.pagination?.page || 1}
          {' / '}
          {data?.pagination?.totalPages || 1}
        </span>

        <button
          disabled={!data?.pagination?.hasNextPage}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>

      </div>

    </div>
  );

}