import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderLock, UploadCloud } from 'lucide-react';
import { getOrganizationEvidence } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

export default function OrgEvidence() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['org-evidence'],
    queryFn: getOrganizationEvidence
  });

  const files = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization"
        title="Organization files"
        subtitle="Only files belonging to your organization are shown."
        actions={
          <Link to="/admin/dashboard" className="btn-secondary">
            <FolderLock size={15} />
            Dashboard
          </Link>
        }
      />

      <section className="panel overflow-hidden">
        <div className="card-header">
          <div>
            <h2 className="section-title">All files</h2>
            <p className="section-subtitle">
              {isLoading ? 'Loading records…' : `${files.length} file${files.length === 1 ? '' : 's'} in your organization`}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} columns={6} /></div>
        ) : isError ? (
          <div className="p-5">
            <div className="alert-danger">Organization files could not be loaded.</div>
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
          </div>
        ) : (
          <EvidenceTable
            files={files}
            emptyTitle="No organization files yet"
            emptyDescription="Files uploaded by members of your organization will appear here."
            emptyAction={
              <Link to="/admin/dashboard" className="btn-secondary btn-sm">
                <UploadCloud size={14} />
                Back to dashboard
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
