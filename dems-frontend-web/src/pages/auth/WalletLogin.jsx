import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function WalletLogin() {
  const navigate = useNavigate();
  const { loginWithWallet, authError } = useAuth();
  const [busy, setBusy] = useState(false);

  const login = async () => {
    setBusy(true);
    try {
      const verified = await loginWithWallet();
      const role = verified.user.role;
      if (role === 'super_admin') {
        navigate('/superadmin/dashboard', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'officer') {
        navigate('/officer/dashboard', { replace: true });
      } else {
        navigate('/citizen/dashboard', { replace: true });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="grid flex-1 place-items-center py-12">
      <div className="panel w-full max-w-xl p-7">
        <Wallet className="mb-4 text-sky-300" size={34} />
        <p className="mb-2 text-xs font-bold uppercase text-sky-300">Wallet authentication</p>
        <h1 className="text-3xl font-extrabold">Connect MetaMask</h1>
        <p className="mt-3 leading-7 text-slate-400">
          DEMS will request a nonce from the backend, ask MetaMask to sign it, verify the signature, then persist the JWT session.
        </p>
        {authError ? <p className="mt-4 border border-red-400/50 bg-red-950/30 p-3 text-sm text-red-200">{authError}</p> : null}
        <button className="btn-primary mt-6 w-full" onClick={login} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} /> : <Wallet size={18} />}
          Connect Wallet
        </button>
      </div>
    </section>
  );
}
