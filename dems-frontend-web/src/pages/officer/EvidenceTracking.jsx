import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { getEvidenceByCase } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';

export default function EvidenceTracking() {
  const [caseId, setCaseId] = useState('');
  const [submittedCaseId, setSubmittedCaseId] = useState('');
  const query = useQuery({
    queryKey: ['case-evidence', submittedCaseId],
    queryFn: () => getEvidenceByCase(submittedCaseId),
    enabled: Boolean(submittedCaseId)
  });

  return (
    <div className="grid gap-4">
      <div className="section-card">
        <h1 className="mb-4 text-2xl font-extrabold">Evidence Tracking</h1>
        <div className="flex gap-3 max-sm:flex-col">
          <input className="input" value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="CASE-2026-001" />
          <button className="btn-primary" onClick={() => setSubmittedCaseId(caseId.trim())} disabled={!caseId.trim()}>
            <Search size={16} />
            Search Case
          </button>
        </div>
      </div>
      <EvidenceTable files={query.data?.data || []} detailsBase="/citizen/evidence" />
    </div>
  );
}
