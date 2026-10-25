import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  FolderLock,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  FolderTree
} from 'lucide-react';

import { getOrganizationOverview, getOrganization } from '../../api/admin.js';
import { getOrganizationAnalytics } from '../../api/analytics.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import InviteEmployee from '../../components/InviteEmployee.jsx';
import { StatCardSkeleton } from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatRelativeTime } from '../../utils/format.js';

const ACTIVITY_LABELS = {
  upload: 'File uploaded',
  ipfs_storage: 'Stored on IPFS',
  quarantine: 'File quarantined',
  membership_application_review: 'Membership reviewed',
  employee_approval: 'Employee approved',
  employee_rejection: 'Employee rejected',
  blockchain_transaction: 'Blockchain transaction',
  evidence_access: 'File accessed'
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [showInviteForm, setShowInviteForm] = useState(false);

  const overview = useQuery({ queryKey: ['org-overview'], queryFn: getOrganizationOverview });
  const organization = useQuery({ queryKey: ['organization'], queryFn: getOrganization });
  const analytics = useQuery({ queryKey: ['analytics', 'organization'], queryFn: getOrganizationAnalytics });

  const data = overview.data || {};
  const activity = analytics.data?.recentActivity || [];
  const loading = overview.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={organization.data?.name || 'Organization workspace'}
        title="Organization overview"
        subtitle="Manage employees, files, and verification activity for your organization."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => setShowInviteForm((current) => !current)}>
              <UserPlus size={15} />
              {showInviteForm ? 'Cancel' : 'Invite employee'}
            </button>
            <Link to="/admin/evidence" className="btn-primary">
              <FolderLock size={15} />
              Browse files
            </Link>
          </>
        }
      />

      {showInviteForm ? (
        <InviteEmployee
          onSuccess={() => setShowInviteForm(false)}
          onCancel={() => setShowInviteForm(false)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <StatCard
              icon={FolderLock}
              label="Organization Files"
              value={data.totalEvidence ?? 0}
              detail="Stored under this organization"
              tone="brand"
            />
            <StatCard
              icon={Users}
              label="Active Employees"
              value={data.employees ?? 0}
              detail="Members with approved access"
              tone="neutral"
            />
            <StatCard
              icon={ShieldAlert}
              label="Pending Review"
              value={data.pendingReview ?? 0}
              detail={data.pendingReview ? 'Files waiting on your decision' : 'Nothing waiting on review'}
              tone={data.pendingReview ? 'warn' : 'neutral'}
            />
            <StatCard
              icon={ShieldCheck}
              label="Blockchain Verified"
              value={data.blockchain ?? 0}
              detail="Confirmed on-chain proofs"
              tone="success"
            />
          </>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="section-title">Recent activity</h2>
              <p className="section-subtitle">Uploads, reviews, and security events</p>
            </div>
            <Link to="/admin/audit-logs" className="btn-ghost btn-sm">
              Audit log
              <ArrowRight size={13} />
            </Link>
          </div>

          {analytics.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="skeleton h-7 w-7 rounded-full" />
                  <span className="skeleton h-3 flex-1" />
                </div>
              ))}
            </div>
          ) : analytics.isError ? (
            <div className="p-5">
              <div className="alert-danger">Activity could not be loaded right now.</div>
            </div>
          ) : activity.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                icon={ClipboardList}
                title="No activity yet"
                description="Uploads, reviews, and access events will appear here once your team starts working."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((event, index) => (
                <li key={event._id || index} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      event.result && event.result !== 'success' ? 'bg-danger' : 'bg-brand'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">
                      {ACTIVITY_LABELS[event.action] || String(event.action || 'Event').replaceAll('_', ' ')}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-faint">
                      {event.actorWallet ? `${event.actorWallet.slice(0, 8)}…${event.actorWallet.slice(-6)}` : 'System'}
                      {event.result && event.result !== 'success' ? ` · ${event.result}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11.5px] text-ink-faint">{formatRelativeTime(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="section-card">
          <h2 className="section-title">Administration</h2>
          <p className="section-subtitle">Common tasks for your organization</p>
          <div className="mt-4 space-y-2">
            {[
              {
                to: '/admin/officer-approval',
                icon: BadgeCheck,
                title: 'Employee approval',
                detail: `${data.pendingApplications ?? 0} pending application${(data.pendingApplications ?? 0) === 1 ? '' : 's'}`
              },
              {
                to: '/admin/quarantine',
                icon: ShieldAlert,
                title: 'Quarantine review',
                detail: `${data.pendingReview ?? 0} awaiting review`
              },
              {
                to: '/admin/users',
                icon: Users,
                title: 'Employees',
                detail: 'Roles and verification status'
              },
              {
                to: '/admin/groups',
                icon: FolderTree,
                title: 'Groups',
                detail: 'Team and access management'
              },
              {
                to: '/admin/organization',
                icon: ClipboardList,
                title: 'Organization settings',
                detail: organization.data?.organizationCode
                  ? `Code ${organization.data.organizationCode}`
                  : 'Policy and access code'
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5 transition hover:border-[#d3d8e0] hover:bg-[#FBFCFD]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-surface text-ink-muted">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                    <span className="block text-[11.5px] text-ink-faint">{item.detail}</span>
                  </span>
                  <ArrowRight size={13} className="shrink-0 text-ink-faint" />
                </Link>
              );
            })}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="detail-label">Quarantined files</p>
            <p className="mt-1 text-[20px] font-semibold text-ink">{data.quarantined ?? 0}</p>
            <p className="mt-0.5 text-[12px] text-ink-faint">Isolated by AI screening until reviewed</p>
          </div>
        </section>
      </div>
    </div>
  );
}
