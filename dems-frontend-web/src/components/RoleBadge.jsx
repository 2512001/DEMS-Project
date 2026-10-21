import React from 'react';
import { BadgeCheck, Crown, Shield, ShieldCheck } from 'lucide-react';

const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Admin',
    Icon: Crown,
    tone: 'text-warn',
    bg: 'bg-warn-soft',
    ring: 'border-[#f0dfbd]'
  },
  admin: {
    label: 'Org Admin',
    Icon: ShieldCheck,
    tone: 'text-brand',
    bg: 'bg-brand-soft',
    ring: 'border-[#d5e2fb]'
  },
  officer: {
    label: 'Employee',
    Icon: BadgeCheck,
    tone: 'text-success',
    bg: 'bg-success-soft',
    ring: 'border-[#c7e9dd]'
  },
  citizen: {
    label: 'User',
    Icon: Shield,
    tone: 'text-ink-muted',
    bg: 'bg-surface',
    ring: 'border-line'
  }
};

export default function RoleBadge({ role = 'citizen', compact = false }) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.citizen;
  const Icon = config.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5 ${config.ring} ${config.bg} ${config.tone}`}
    >
      <Icon size={11} strokeWidth={2.2} aria-hidden="true" />
      {compact ? null : config.label}
      {compact ? <span className="sr-only">{config.label}</span> : null}
    </span>
  );
}

export function roleLabel(role) {
  return (ROLE_CONFIG[role] || ROLE_CONFIG.citizen).label;
}
