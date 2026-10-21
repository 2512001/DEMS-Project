import React from 'react';

export default function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div
      role="tablist"
      aria-label="Sections"
      className={`inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[9px] border border-line bg-surface p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition ${
              active
                ? 'bg-card text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            {Icon ? <Icon size={14} aria-hidden="true" /> : null}
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className={`ml-0.5 rounded-full px-1.5 text-[11px] leading-5 ${active ? 'bg-brand-soft text-brand' : 'bg-card text-ink-faint'}`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
