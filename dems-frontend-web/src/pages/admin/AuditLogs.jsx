import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../../api/admin.js';
import HashValue from '../../components/HashValue.jsx';
import { formatDate } from '../../utils/format.js';

export default function AuditLogs() {
  const { data } = useQuery({ queryKey: ['audit-logs'], queryFn: getAuditLogs });
  const logs = data?.data || [];

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-extrabold">Audit Logs</h1>
      <div className="grid gap-3">
        {logs.map((log) => (
          <div className="section-card" key={log._id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-sm uppercase text-sky-300">{log.action}</p>
                <HashValue value={log.actorWallet || log.targetId || log._id} compact={false} />
                {log.reason ? <p className="mt-2 text-sm text-slate-400">{log.reason}</p> : null}
              </div>
              <p className="text-sm text-slate-400">{log.result}</p>
            </div>
            <p className="mt-3 text-sm text-slate-400">{formatDate(log.createdAt)}</p>
          </div>
        ))}
        {!logs.length ? <div className="section-card text-slate-400">No audit events found.</div> : null}
      </div>
    </div>
  );
}
