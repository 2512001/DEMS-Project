import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrganizationEvidence } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';

export default function OrgEvidence() {
  const { data, isLoading } = useQuery({ queryKey: ['org-evidence'], queryFn: getOrganizationEvidence });

  return (
    <div className="section-card">
      <h1 className="mb-4 text-2xl font-extrabold">Organization Evidence</h1>
      <p className="mb-4 text-sm text-slate-400">Only evidence belonging to your organization is shown.</p>
      {isLoading ? <p className="text-slate-400">Loading...</p> : <EvidenceTable files={data?.data || []} />}
    </div>
  );
}
