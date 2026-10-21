import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { listQuarantine, getOrganizationOverview } from '../../api/admin.js';
import { getPlatformAnalytics } from '../../api/analytics.js';

/**
 * Notification counts are derived from endpoints that already expose pending
 * work for the current role. Nothing is fabricated — when every counter is
 * zero we say so explicitly.
 */
export default function NotificationsMenu() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const isAdmin = role === 'admin';
  const isOfficer = role === 'officer';
  const isSuperAdmin = role === 'super_admin';

  const quarantine = useQuery({
    queryKey: ['quarantine'],
    queryFn: listQuarantine,
    enabled: isAdmin || isOfficer
  });

  const overview = useQuery({
    queryKey: ['org-overview'],
    queryFn: getOrganizationOverview,
    enabled: isAdmin
  });

  const analytics = useQuery({
    queryKey: ['platform-analytics'],
    queryFn: getPlatformAnalytics,
    enabled: isSuperAdmin
  });

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const items = [];
  if (isAdmin) {
    const pendingReview = overview.data?.pendingReview || 0;
    const pendingApplications = overview.data?.pendingApplications || 0;
    const quarantined = quarantine.data?.data?.length || 0;
    if (pendingReview > 0) {
      items.push({
        id: 'review',
        title: 'Files awaiting review',
        detail: `${pendingReview} quarantine record${pendingReview === 1 ? '' : 's'} need a decision`,
        to: '/admin/quarantine',
        tone: 'warn'
      });
    }
    if (pendingApplications > 0) {
      items.push({
        id: 'applications',
        title: 'Employee applications',
        detail: `${pendingApplications} membership request${pendingApplications === 1 ? '' : 's'} pending`,
        to: '/admin/officer-approval',
        tone: 'brand'
      });
    }
    if (quarantined > 0 && pendingReview === 0) {
      items.push({
        id: 'quarantine',
        title: 'Quarantine records',
        detail: `${quarantined} file${quarantined === 1 ? '' : 's'} currently isolated`,
        to: '/admin/quarantine',
        tone: 'neutral'
      });
    }
  }

  if (isOfficer) {
    const pending = (quarantine.data?.data || []).filter((item) => item.reviewStatus === 'pending_review').length;
    if (pending > 0) {
      items.push({
        id: 'pending',
        title: 'Files pending admin review',
        detail: `${pending} upload${pending === 1 ? '' : 's'} waiting on your organization admin`,
        to: '/officer/pending-reviews',
        tone: 'warn'
      });
    }
  }

  if (isSuperAdmin) {
    const pendingInvitations = analytics.data?.overview?.pendingInvitations || 0;
    const quarantined = analytics.data?.overview?.quarantinedEvidence || 0;
    if (pendingInvitations > 0) {
      items.push({
        id: 'invitations',
        title: 'Pending invitations',
        detail: `${pendingInvitations} invitation${pendingInvitations === 1 ? '' : 's'} not yet accepted`,
        to: '/superadmin/dashboard',
        tone: 'brand'
      });
    }
    if (quarantined > 0) {
      items.push({
        id: 'quarantined',
        title: 'Quarantined evidence',
        detail: `${quarantined} record${quarantined === 1 ? '' : 's'} across the platform`,
        to: '/superadmin/dashboard',
        tone: 'warn'
      });
    }
  }

  const count = items.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="icon-btn relative"
        aria-label={count ? `Notifications (${count})` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} />
        {count > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warn ring-2 ring-card" />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[320px] animate-slide-up overflow-hidden rounded-card border border-line bg-card shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">Notifications</p>
            {count > 0 ? <span className="badge-warn">{count}</span> : null}
          </div>
          {count === 0 ? (
            <div className="flex items-start gap-2.5 px-4 py-6">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
              <div>
                <p className="text-[13px] font-medium text-ink">You&apos;re all caught up</p>
                <p className="mt-0.5 text-[12.5px] leading-5 text-ink-muted">
                  No pending reviews or approvals need your attention.
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-2.5 px-4 py-3 transition hover:bg-surface"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        item.tone === 'warn' ? 'bg-warn' : item.tone === 'brand' ? 'bg-brand' : 'bg-ink-faint'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-ink">{item.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-5 text-ink-muted">{item.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
