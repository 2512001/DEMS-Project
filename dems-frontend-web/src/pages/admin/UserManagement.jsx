import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../api/admin.js';
import HashValue from '../../components/HashValue.jsx';
import RoleBadge from '../../components/RoleBadge.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

export default function UserManagement() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: getUsers });
  const users = data?.data || [];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">User Management</h1>
      <div className="table-wrap">
        <table className="min-w-[860px] w-full border-collapse text-sm">
          <thead className="bg-slate-900 text-left text-xs uppercase text-slate-400">
            <tr><th className="p-3">Wallet</th><th className="p-3">Role</th><th className="p-3">Verification</th><th className="p-3">Updated</th></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t border-slate-800" key={user._id}>
                <td className="p-3"><HashValue value={user.walletAddress} compact={false} /></td>
                <td className="p-3"><RoleBadge role={user.role} /></td>
                <td className="p-3"><StatusBadge status={user.officerVerification?.status || 'none'} /></td>
                <td className="p-3 text-slate-400">{formatDate(user.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isLoading ? <p className="text-slate-400">Loading users...</p> : null}
    </div>
  );
}
