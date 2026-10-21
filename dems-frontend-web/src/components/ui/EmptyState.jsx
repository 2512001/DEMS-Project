import React from 'react';

export default function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-card border border-dashed border-line bg-[#FBFCFD] text-center ${
        compact ? 'px-5 py-9' : 'px-6 py-14'
      }`}
    >
      {Icon ? (
        <span className="mb-3.5 grid h-11 w-11 place-items-center rounded-[11px] border border-line bg-card text-ink-faint shadow-card">
          <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
        </span>
      ) : null}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
