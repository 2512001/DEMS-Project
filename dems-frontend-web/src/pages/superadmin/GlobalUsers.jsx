import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, UserCheck, ShieldAlert, Building2, X } from 'lucide-react';
import { getPlatformUsers } from '../../api/admin.js';
import { listOrganizations } from '../../api/admin.js';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../../utils/format.js';

export default function GlobalUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const { data: usersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-users', page, roleFilter, orgFilter, membershipFilter, search],
    queryFn: () => getPlatformUsers({
      page,
      limit: 20,
      role: roleFilter,
      organizationId: orgFilter,
      membershipStatus: membershipFilter,
      search
    })
  });

  const { data: orgsData } = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizations
  });

  const users = usersData?.data || [];
  const total = usersData?.total || 0;
  const organizations = orgsData?.data || [];

  const hasActiveFilters = search || roleFilter || orgFilter || membershipFilter;

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setOrgFilter('');
    setMembershipFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform administration"
        title="Global users"
        subtitle="View and manage all users across the platform."
      />

      <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email, or wallet"
            className="input pl-8 pr-8"
            aria-label="Search users"
          />
          {search ? (
            <button
              type="button"
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-ink-faint hover:bg-surface hover:text-ink"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary btn-sm"
          aria-expanded={showFilters}
        >
          <Filter size={14} />
          Filters
          {hasActiveFilters && <span className="ml-1.5 rounded-full bg-brand px-1.5 py-0.5 text-[11px] text-white">Active</span>}
        </button>
      </div>

      {showFilters && (
        <div className="grid gap-4 border-b border-line px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <div>
            <label className="block text-[12px] font-medium text-ink-faint mb-1.5">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="input"
            >
              <option value="">All roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="officer">Employee</option>
              <option value="citizen">Citizen</option>
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-faint mb-1.5">Organization</label>
            <select
              value={orgFilter}
              onChange={(e) => { setOrgFilter(e.target.value); setPage(1); }}
              className="input"
            >
              <option value="">All organizations</option>
              {organizations.map((org) => (
                <option key={org._id} value={org._id}>{org.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-ink-faint mb-1.5">Membership status</label>
            <select
              value={membershipFilter}
              onChange={(e) => { setMembershipFilter(e.target.value); setPage(1); }}
              className="input"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending_approval">Pending approval</option>
              <option value="rejected">Rejected</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="flex items-end">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={clearFilters}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={7} columns={6} />
      ) : isError ? (
        <div className="p-5">
          <div className="alert-danger">Users could not be loaded.</div>
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => refetch()}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No users found"
          description={hasActiveFilters ? "Try adjusting your filters." : "No users have been created yet."}
        />
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Organization</th>
                  <th scope="col">Membership</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div>
                        <p className="text-[13px] font-medium text-ink">{user.profile?.displayName || 'Unnamed user'}</p>
                        <p className="text-[11.5px] text-ink-f">{user.profile?.email || user.walletAddress}</p>
                      </div>
                    </td>
                    <td>
                      <StatusBadge 
                        status={user.role === 'super_admin' ? 'verified' : user.role === 'admin' ? 'approved' : user.role === 'officer' ? 'pending' : 'not_requested'} 
                        label={user.role} 
                      />
                    </td>
                    <td>
                      {user.organizationName ? (
                        <div>
                          <p className="text-[13px] text-ink">{user.organizationName}</p>
                          <p className="text-[11.5px] text-ink-faint">{user.organizationCode}</p>
                        </div>
                      ) : (
                        <span className="text-[13px] text-ink-muted">None</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge 
                        status={user.membershipStatus === 'active' ? 'approved' : user.membershipStatus === 'pending_approval' ? 'pending' : user.membershipStatus === 'rejected' ? 'failed' : 'not_requested'} 
                        label={user.membershipStatus || 'None'} 
                      />
                    </td>
                    <td>
                      <StatusBadge 
                        status={user.accountStatus === 'active' ? 'approved' : 'failed'} 
                        label={user.accountStatus || 'Unknown'} 
                      />
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="text-[12.5px] text-ink-muted" title={formatDate(user.createdAt)}>
                        {formatRelativeTime(user.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {total > 20 && (
            <div className="border-t border-line px-4 py-3 flex items-center justify-between sm:px-5">
              <p className="text-[12.5px] text-ink-muted">
                Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} users
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
