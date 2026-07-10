import React from 'react';
import { BadgeCheck, Shield, ShieldCheck } from 'lucide-react';

export default function RoleBadge({ role = 'citizen' }) {
  const Icon = role === 'admin' ? ShieldCheck : role === 'officer' ? BadgeCheck : Shield;
  const color = role === 'admin' ? 'text-emerald-300 border-emerald-400/40' : role === 'officer' ? 'text-sky-300 border-sky-400/40' : 'text-slate-300 border-slate-700';
  return (
    <span className={`status-pill ${color}`}>
      <Icon size={15} />
      {role}
    </span>
  );
}
