import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Users, X, UserMinus, Plus } from 'lucide-react';
import { getUsers } from '../../api/admin.js';
import { getOrganizationGroups, addMemberToGroup, removeMemberFromGroup } from '../../api/groups.js';
import RoleBadge from '../../components/RoleBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { formatDate, formatRelativeTime } from '../../utils/format.js';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers
  });
  const [term, setTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const users = data?.data || [];

  const groups = useQuery({
    queryKey: ['org-groups'],
    queryFn: getOrganizationGroups,
    enabled: showGroupModal
  });

  const addMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => addMemberToGroup(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      push('Member added to group.', { tone: 'success' });
      setShowGroupModal(false);
      setSelectedUser(null);
    },
    onError: (err) => push(err?.response?.data?.message || 'Failed to add member.', { tone: 'error' })
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }) => removeMemberFromGroup(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-groups'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      push('Member removed from group.', { tone: 'success' });
      setRemoveConfirm(null);
    },
    onError: (err) => push(err?.response?.data?.message || 'Failed to remove member.', { tone: 'error' })
  });

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
                  <th scope="col">Membership</th>
                  <th scope="col">Groups</th>
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
                            {user.profile?.email || 'Authorized user'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td><RoleBadge role={user.role} /></td>
                    <td><StatusBadge status={user.officerVerification?.status || 'none'} /></td>
                    <td>
                      <StatusBadge status={user.membershipStatus || 'none'} />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {user.groups && user.groups.length > 0 ? (
                          <span className="text-[12px] text-ink-muted">
                            {user.groups.length} group{user.groups.length === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-faint">No groups</span>
                        )}
                        {user.membershipStatus === 'active' ? (
                          <button
                            type="button"
                            className="btn-ghost btn-sm p-1"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowGroupModal(true);
                            }}
                            title="Manage groups"
                          >
                            <Plus size={13} />
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink-faint" title="Only active members can be assigned to groups">
                            Pending approval
                          </span>
                        )}
                      </div>
                    </td>
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

      {/* Group Assignment Modal */}
      <Modal
        open={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setSelectedUser(null);
        }}
        title={`Manage groups for ${selectedUser?.profile?.displayName || 'this employee'}`}
        description={selectedUser?.membershipStatus === 'active' ? 'Add or remove group memberships' : 'Employee must be approved before group assignment'}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowGroupModal(false);
                setSelectedUser(null);
              }}
            >
              Close
            </button>
          </>
        }
      >
        {groups.isLoading ? (
          <div className="py-4 text-center text-ink-muted">Loading groups...</div>
        ) : !selectedUser ? (
          <div className="py-4 text-center text-ink-muted">No user selected</div>
        ) : selectedUser.membershipStatus !== 'active' ? (
          <div className="py-4 text-center text-ink-muted">
            This employee's membership is {selectedUser.membershipStatus}. Approve their membership first before assigning to groups.
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {groups.data?.data?.map((group) => {
              const isMember = group.members?.some(m => m._id === selectedUser._id);
              return (
                <div
                  key={group._id}
                  className="flex items-center justify-between rounded-[8px] border border-line px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{group.name}</p>
                    <p className="text-[11.5px] text-ink-muted">{group.members?.length || 0} members</p>
                  </div>
                  {isMember ? (
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-danger p-1"
                      onClick={() => setRemoveConfirm({ groupId: group._id, userId: selectedUser._id, groupName: group.name })}
                      title="Remove from group"
                    >
                      <UserMinus size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost btn-sm text-brand p-1"
                      onClick={() => addMemberMutation.mutate({ groupId: group._id, userId: selectedUser._id })}
                      disabled={addMemberMutation.isPending}
                      title="Add to group"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              );
            })}
            {groups.data?.data?.length === 0 && (
              <div className="py-4 text-center text-ink-muted">No groups available. Create groups first.</div>
            )}
          </div>
        )}
      </Modal>

      {/* Remove from Group Confirmation */}
      <Modal
        open={Boolean(removeConfirm)}
        onClose={() => setRemoveConfirm(null)}
        title="Remove from group?"
        description={`Remove this employee from "${removeConfirm?.groupName}"?`}
        size="sm"
        footer={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRemoveConfirm(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={() => removeMemberMutation.mutate(removeConfirm)}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? 'Removing…' : 'Remove'}
            </button>
          </>
        }
      />
    </div>
  );
}
