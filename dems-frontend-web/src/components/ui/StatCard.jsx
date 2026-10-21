import React from 'react';

const TONES = {
  brand: { icon: 'bg-brand-soft text-brand', value: 'text-ink' },
  success: { icon: 'bg-success-soft text-success', value: 'text-ink' },
  warn: { icon: 'bg-warn-soft text-warn', value: 'text-ink' },
  danger: { icon: 'bg-danger-soft text-danger', value: 'text-ink' },
  neutral: { icon: 'bg-surface text-ink-muted', value: 'text-ink' }
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'brand',
  loading = false
}) {
  const config = TONES[tone] || TONES.brand;

  return (
    <div className="stat">
      <div className="flex items-start justify-between gap-3">
        <p className="stat-label">{label}</p>
        {Icon ? (
          <span className={`stat-icon ${config.icon}`}>
            <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={`stat-value ${config.value}`} aria-live="polite">
        {loading ? <span className="skeleton inline-block h-6 w-16 align-middle" /> : value}
      </p>
      {detail ? <p className="mt-2 text-[12px] leading-5 text-ink-faint">{detail}</p> : null}
    </div>
  );
}
