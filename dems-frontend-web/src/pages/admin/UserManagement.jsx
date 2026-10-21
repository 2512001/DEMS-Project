import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, X } from 'lucide-react';
import { getUsers } from '../../api/admin.js';
import HashValue from '../../components/HashValue.jsx';
import RoleBadge from '../../components/RoleBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../../utils/format.js';

export default function UserManagement() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers
  });
  const [term, setTerm] = useState('');
  const users = data?.data || [];

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.walletAddress, user.role, user.profile?.displayName, user.profile?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [users, term]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization"
        title="Employees"
        subtitle="Everyone with access to your organization, and their verification state."
      />

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="section-title">Members</h2>
            <p className="section-subtitle">{isLoading ? 'Loading…' : `${users.length} member${users.length === 1 ? '' : 's'}`}</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              className="input pl-8 pr-8"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search by name, email, wallet or role"
              aria-label="Search members"
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
          <div className="p-4"><TableSkeleton rows={6} columns={5} /></div>
        ) : isError ? (
          <div className="p-5">
            <div className="alert-danger">Members could not be loaded.</div>
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact
              icon={Users}
              title={users.length ? 'No members match your search' : 'No members yet'}
              description={
                users.length
                  ? 'Try a different name, email, wallet address or role.'
                  : 'Invite employees from the dashboard to give them organization access.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Role</th>
                  <th scope="col">Verification</th>
                  <th scope="col">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11.5px] font-semibold text-brand">
                          {(user.profile?.displayName || user.walletAddress || 'U').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-ink">
                            {user.profile?.displayName || 'Unnamed member'}
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-ink-faint">
                            {user.profile?.email || <HashValue value={user.walletAddress} compact />}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={user.role} /></td>
                    <td><StatusBadge status={user.officerVerification?.status || 'none'} /></td>
                    <td className="whitespace-nowrap">
                      <span className="text-[12.5px] text-ink-muted" title={formatDate(user.updatedAt)}>
                        {formatRelativeTime(user.updatedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
