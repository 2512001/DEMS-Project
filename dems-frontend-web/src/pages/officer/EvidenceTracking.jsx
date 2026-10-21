import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getEvidenceByCase } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';

export default function EvidenceTracking() {
  const [caseId, setCaseId] = useState('');
  const [submittedCaseId, setSubmittedCaseId] = useState('');

  const query = useQuery({
    queryKey: ['case-evidence', submittedCaseId],
    queryFn: () => getEvidenceByCase(submittedCaseId),
    enabled: Boolean(submittedCaseId)
  });

  const files = query.data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Evidence tracking"
        subtitle="Look up every file associated with a case ID."
      />

      <section className="section-card">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedCaseId(caseId.trim());
          }}
        >
          <div className="relative flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-8"
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
              placeholder="CASE-2026-001"
              aria-label="Case ID"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!caseId.trim()}>
            <Search size={15} />
            Search case
          </button>
        </form>
        <p className="hint">Results include only files you are authorized to access.</p>
      </section>

      {submittedCaseId ? (
        <section className="panel overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Case {submittedCaseId}</h2>
              <p className="section-subtitle">
                {query.isLoading
                  ? 'Searching…'
                  : query.isError
                    ? 'The search could not be completed.'
                    : `${files.length} file${files.length === 1 ? '' : 's'} found`}
              </p>
            </div>
          </div>
          <EvidenceTable
            files={query.isLoading ? [] : files}
            emptyTitle={query.isError ? 'Search failed' : query.isLoading ? 'Searching…' : 'No files for this case'}
            emptyDescription={
              query.isError
                ? 'Please try again in a moment.'
                : query.isLoading
                  ? 'Please wait while records are retrieved.'
                  : 'No accessible files reference this case ID.'
            }
          />
        </section>
      ) : null}
    </div>
  );
}
