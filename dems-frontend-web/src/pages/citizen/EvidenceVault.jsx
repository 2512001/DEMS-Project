import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCcw, Archive, Shield, TrendingUp, Clock, Database } from 'lucide-react';
import { getMyFiles } from '../../api/evidence.js';
import EvidenceTable from '../../components/EvidenceTable.jsx';

function StatCard({ icon: Icon, label, value, color = 'sky' }) {
  const colorConfig = {
    sky: {
      bg: 'from-sky-500/10 to-sky-600/5',
      border: 'border-sky-500/30',
      iconBg: 'bg-sky-500/20',
      iconColor: 'text-sky-400'
    },
    emerald: {
      bg: 'from-emerald-500/10 to-emerald-600/5',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400'
    },
    violet: {
      bg: 'from-violet-500/10 to-violet-600/5',
      border: 'border-violet-500/30',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400'
    }
  };

  const config = colorConfig[color];

  return (
    <div className={`group relative overflow-hidden rounded-xl border ${config.border} bg-gradient-to-br ${config.bg} p-5 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-${color}-500/10`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center rounded-xl ${config.iconBg} p-3 transition-all duration-300 group-hover:scale-110`}>
            <Icon size={24} className={config.iconColor} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          </div>
        </div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r ${color === 'sky' ? 'from-sky-500/0 via-sky-500/5 to-sky-500/0' : color === 'emerald' ? 'from-emerald-500/0 via-emerald-500/5 to-emerald-500/0' : 'from-violet-500/0 via-violet-500/5 to-violet-500/0'} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
    </div>
  );
}

export default function EvidenceVault() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['my-files', page],
    queryFn: () => getMyFiles(page, 5),
    placeholderData: (prev) => prev
  });

  const files = [...(query.data?.quarantine || []), ...(query.data?.data || [])];
  const pagination = query.data?.pagination || {};

  const totalRecords = pagination.totalRecords || 0;
  const totalPages = pagination.totalPages || 1;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-transparent to-sky-500/5 opacity-50" />
        <div className="relative px-8 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/30 to-sky-600/20 p-4 shadow-lg shadow-sky-500/30">
                <Archive size={48} className="text-sky-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Evidence Vault
                </h1>
                <p className="mt-2 text-base text-slate-400">
                  Secure decentralized storage for your digital evidence
                </p>
              </div>
            </div>

            <button
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              className="group flex items-center gap-3 rounded-xl border border-slate-600/50 bg-slate-800/50 px-6 py-3 transition-all hover:border-sky-500/50 hover:bg-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20 disabled:opacity-50 disabled:hover:border-slate-600/50 disabled:hover:bg-slate-800/50 disabled:hover:shadow-none"
            >
              <RefreshCcw
                className={`transition-transform ${query.isFetching ? 'animate-spin text-sky-400' : 'text-slate-400 group-hover:text-sky-400 group-hover:rotate-180'}`}
                size={20}
              />
              <span className="font-medium text-white">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Database}
          label="Total Evidence"
          value={totalRecords}
          color="sky"
        />
        <StatCard
          icon={Shield}
          label="Verified"
          value={files.filter(f => f.status === 'stored_on_chain').length}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={files.filter(f => f.status === 'pending_blockchain').length}
          color="violet"
        />
        <StatCard
          icon={TrendingUp}
          label="This Page"
          value={files.length}
          color="sky"
        />
      </div>

      {/* Evidence Table */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/30 to-slate-900/30 backdrop-blur-xl">
        <div className="border-b border-slate-700/50 bg-slate-900/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-slate-400" />
            <h3 className="text-lg font-bold text-white">Evidence Records</h3>
          </div>
        </div>
        <div className="p-6">
          <EvidenceTable files={files} />
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 rounded-xl border border-slate-700/50 bg-slate-800/30 px-6 py-4 backdrop-blur-sm">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={!pagination.hasPrevPage}
            className="group flex items-center gap-2 rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 transition-all hover:border-sky-500/50 hover:bg-sky-500/10 disabled:opacity-50 disabled:hover:border-slate-600/50 disabled:hover:bg-slate-700/50"
          >
            <span className="font-medium text-white">Previous</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Page</span>
            <span className="text-lg font-bold text-white">{pagination.page || 1}</span>
            <span className="text-sm text-slate-400">of</span>
            <span className="text-lg font-bold text-white">{totalPages}</span>
          </div>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage}
            className="group flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-2 transition-all hover:border-sky-500/50 hover:bg-sky-500/20 disabled:opacity-50 disabled:hover:border-slate-600/50 disabled:hover:bg-slate-700/50"
          >
            <span className="font-medium text-white">Next</span>
          </button>
        </div>
      )}
    </div>
  );
}