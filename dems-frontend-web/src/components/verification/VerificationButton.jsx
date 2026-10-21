import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function VerificationButton({ onVerify, isLoading, disabled = false, loadingMessage }) {
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onVerify}
        disabled={isLoading || disabled}
        className="btn-primary w-full sm:w-auto"
      >
        {isLoading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <ShieldCheck size={15} />
        )}
        {isLoading ? 'Verifying…' : 'Verify with blockchain'}
      </button>

      {isLoading && loadingMessage ? (
        <div className="flex items-center gap-2.5 rounded-[9px] border border-[#d5e2fb] bg-brand-soft px-3 py-2 text-[12.5px] text-[#2a4ea8]">
          <Loader2 size={13} className="animate-spin" />
          {loadingMessage}
        </div>
      ) : null}
    </div>
  );
}
