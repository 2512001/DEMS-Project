import React from 'react';
import { ShieldCheck, AlertTriangle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  VERIFIED: {
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400'
  },
  TAMPERED: {
    gradient: 'from-red-500/20 to-red-600/10',
    border: 'border-red-500/30',
    text: 'text-red-300',
    icon: AlertTriangle,
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400'
  },
  PENDING: {
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    icon: Clock,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400'
  }
};

export default function VerificationStatusBadge({ status = 'PENDING' }) {
  const normalized = String(status || 'PENDING').toUpperCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border ${config.border} bg-gradient-to-r ${config.gradient} px-4 py-2 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105`}>
      <div className={`flex items-center justify-center rounded-full ${config.iconBg} p-1`}>
        <Icon size={14} className={config.iconColor} />
      </div>
      <span className={`text-sm font-semibold tracking-wide ${config.text}`}>
        {normalized.replaceAll('_', ' ')}
      </span>
    </div>
  );
}
