import React from 'react';
import { Lock, Clock, ShieldCheck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const STATUS_CONFIG = {
  encrypted: {
    icon: Lock,
    gradient: 'from-sky-500/20 to-sky-600/10',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-400'
  },
  pending_blockchain: {
    icon: Clock,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400'
  },
  stored_ipfs: {
    icon: Lock,
    gradient: 'from-sky-500/20 to-sky-600/10',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-400'
  },
  quarantine: {
    icon: AlertCircle,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400'
  },
  pending_review: {
    icon: Clock,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400'
  },
  stored_on_chain: {
    icon: ShieldCheck,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400'
  },
  pending: {
    icon: Clock,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400'
  },
  approved: {
    icon: CheckCircle2,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400'
  },
  rejected: {
    icon: XCircle,
    gradient: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    text: 'text-red-300',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400'
  },
  none: {
    icon: Clock,
    gradient: 'from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-400'
  },
  not_required: {
    icon: CheckCircle2,
    gradient: 'from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-400'
  },
  not_requested: {
    icon: Clock,
    gradient: 'from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-400'
  },
  error: {
    icon: AlertCircle,
    gradient: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    text: 'text-red-300',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400'
  },
  failed: {
    icon: XCircle,
    gradient: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    text: 'text-red-300',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400'
  }
};

export default function StatusBadge({ status = 'pending' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border ${config.border} bg-gradient-to-r ${config.gradient} px-4 py-2 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105`}>
      <div className={`flex items-center justify-center rounded-full ${config.iconBg} p-1`}>
        <Icon size={14} className={config.iconColor} />
      </div>
      <span className={`text-sm font-semibold tracking-wide ${config.text}`}>
        {String(status).replaceAll('_', ' ')}
      </span>
    </div>
  );
}
