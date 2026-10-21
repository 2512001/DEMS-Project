import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function BrandMark({ size = 'md', withText = true }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-[9px]' : 'h-9 w-9 rounded-[10px]';
  const icon = size === 'sm' ? 17 : 19;

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid ${box} place-items-center bg-brand text-white shadow-[0_1px_2px_rgba(16,24,40,0.18)]`}>
        <ShieldCheck size={icon} strokeWidth={2.1} aria-hidden="true" />
      </span>
      {withText ? (
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-[-0.01em] text-ink">DEMS</span>
          <span className="block text-[11px] font-medium text-ink-faint">Secure File Vault</span>
        </span>
      ) : null}
    </span>
  );
}
