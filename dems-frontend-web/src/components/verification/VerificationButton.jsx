import React from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function VerificationButton({ onVerify, isLoading, disabled = false, loadingMessage }) {
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={onVerify}
        disabled={isLoading || disabled}
        className="btn-primary min-h-12 w-full px-6 text-base md:w-auto"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ShieldCheck size={18} />
        )}
        Verify Using Blockchain
      </button>

      {isLoading && loadingMessage ? (
        <div className="flex items-center gap-3 border border-sky-400/30 bg-sky-400/5 px-4 py-3">
          <Loader2 size={16} className="animate-spin text-sky-300" />
          <p className="text-sm font-medium text-sky-200">{loadingMessage}</p>
        </div>
      ) : null}
    </div>
  );
}
