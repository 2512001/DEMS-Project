import React from 'react';
import { BadgeCheck, Shield, ShieldCheck, Crown } from 'lucide-react';

const ROLE_CONFIG = {
  super_admin: {
    icon: Crown,
    gradient: 'from-amber-500/20 to-amber-600/10',
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    label: 'Super Admin'
  },
  admin: {
    icon: ShieldCheck,
    gradient: 'from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    label: 'Org Admin'
  },
  officer: {
    icon: BadgeCheck,
    gradient: 'from-sky-500/20 to-sky-600/10',
    border: 'border-sky-500/30',
    text: 'text-sky-300',
    iconBg: 'bg-sky-500/20',
    iconColor: 'text-sky-400',
    label: 'Employee'
  },
  citizen: {
    icon: Shield,
    gradient: 'from-slate-500/20 to-slate-600/10',
    border: 'border-slate-500/30',
    text: 'text-slate-300',
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-400',
    label: 'User'
  }
};

export default function RoleBadge({ role = 'citizen' }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;
  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border ${config.border} bg-gradient-to-r ${config.gradient} px-4 py-2 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105`}>
      <div className={`flex items-center justify-center rounded-full ${config.iconBg} p-1`}>
        <Icon size={14} className={config.iconColor} />
      </div>
      <span className={`text-sm font-semibold tracking-wide ${config.text}`}>
        {config.label}
      </span>
    </div>
  );
}
