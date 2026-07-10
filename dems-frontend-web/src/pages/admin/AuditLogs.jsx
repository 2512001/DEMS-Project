import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/admin.js';
import HashValue from '../../components/HashValue.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { formatDate } from '../../utils/format.js';

export default function AuditLogs() {
  const { data } = useQuery({ queryKey: ['audit-logs'], queryFn: getAuditLogs });
  const logs = data?.data || [];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Audit Logs</h1>
      <div className="grid gap-3">
        {logs.map((log) => (
          <div className="section-card" key={`${log.type}-${log.id}`}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-sm uppercase text-sky-300">{log.type}</p>
                <HashValue value={log.walletAddress || log.txHash || log.id} compact={false} />
              </div>
              <StatusBadge status={log.status || log.role} />
            </div>
            <p className="mt-3 text-sm text-slate-400">{formatDate(log.timestamp)}</p>
          </div>
        ))}
        {!logs.length ? <div className="section-card text-slate-400">No audit events found.</div> : null}
      </div>
    </div>
  );
}
