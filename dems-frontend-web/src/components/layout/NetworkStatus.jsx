import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Wallet } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { REQUIRED_NETWORK_LABEL, chainLabel } from '../../blockchain/wallet.js';
import { shortAddress } from '../../utils/format.js';

/**
 * Network + wallet state. A success state is only rendered when MetaMask is
 * actually connected AND sitting on the required chain.
 */
export default function NetworkStatus() {
  const { walletAddress, chainId, isSepolia, forceSepolia } = useAuth();
  const connected = Boolean(walletAddress);
  const wrongNetwork = connected && !isSepolia;

  if (!connected) {
    return (
      <div className="flex items-center gap-2 rounded-[9px] border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink-muted">
        <Wallet size={13} aria-hidden="true" />
        <span className="hidden sm:inline">Wallet not connected</span>
        <span className="sm:hidden">Wallet</span>
      </div>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => {
          Promise.resolve(forceSepolia?.()).catch(() => {});
        }}
        className="flex items-center gap-2 rounded-[9px] border border-[#f0dfbd] bg-warn-soft px-2.5 py-1.5 text-[12px] font-medium text-warn transition hover:border-[#e3cda0]"
        title={`Switch MetaMask to ${REQUIRED_NETWORK_LABEL}`}
      >
        <AlertTriangle size={13} aria-hidden="true" />
        <span className="hidden sm:inline">Switch to {REQUIRED_NETWORK_LABEL}</span>
        <span className="sm:hidden">Wrong network</span>
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-[9px] border border-line bg-card px-2.5 py-1.5 text-[12px] text-ink-muted"
      title={shortAddress(walletAddress)}
    >
      <span className="dot bg-success shadow-[0_0_0_3px_rgba(22,133,104,0.12)]" aria-hidden="true" />
      <span className="hidden md:inline">{chainLabel(chainId)}</span>
      <span className="md:hidden">{REQUIRED_NETWORK_LABEL.split(' ')[0]}</span>
    </div>
  );
}

export function WalletAddress() {
  const { walletAddress, user } = useAuth();
  return (
    <Link
      to="/citizen/profile"
      className="hidden font-mono text-[12px] text-ink-muted transition hover:text-ink lg:inline"
      title={walletAddress || user?.walletAddress || ''}
    >
      {shortAddress(walletAddress || user?.walletAddress)}
    </Link>
  );
}
