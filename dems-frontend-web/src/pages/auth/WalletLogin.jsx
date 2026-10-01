import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Wallet, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';

function dashboardPath(role) {
  if (role === 'super_admin') return '/superadmin/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'officer') return '/officer/dashboard';
  return '/citizen/dashboard';
}

export default function WalletLogin() {
  const navigate = useNavigate();
  const { loginWithWallet, authError, setAuthError, isAuthenticated, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [showMetaMaskHelp, setShowMetaMaskHelp] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);

  // Check if MetaMask is installed
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  useEffect(() => {
    const checkMetaMask = () => {
      setIsMetaMaskInstalled(!!window.ethereum);
    };
    checkMetaMask();
    
    // Check current network
    const checkNetwork = async () => {
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        setCurrentNetwork(chainId);
        console.log('[NETWORK] Current chain ID:', chainId);
      }
    };
    checkNetwork();

    const onChainChanged = (chainId) => {
      setCurrentNetwork(chainId);
      console.log('[NETWORK] Chain changed to:', chainId);
    };

    if (window.ethereum) {
      window.ethereum.on('chainChanged', onChainChanged);
      window.ethereum.on('accountsChanged', checkMetaMask);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', onChainChanged);
        window.ethereum.removeListener('accountsChanged', checkMetaMask);
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(dashboardPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const login = async () => {
    setBusy(true);
    setAuthError('');
    setLoginSuccess(false);
    try {
      console.log('[LOGIN] Starting wallet authentication...');

      const verified = await loginWithWallet();
      console.log('[LOGIN] Wallet verification successful:', verified);

      if (!verified || !verified.user) {
        throw new Error('Authentication failed: No user data received');
      }

      setLoginSuccess(true);
      navigate(dashboardPath(verified.user.role), { replace: true });
    } catch (error) {
      console.error('[LOGIN] Authentication error:', error);
      setAuthError(error.message || 'Wallet authentication failed.');
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

        {!isMetaMaskInstalled && (
          <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-300 mb-2">MetaMask is required</p>
                <p className="text-xs text-slate-400 mb-3">
                  MetaMask is a cryptocurrency wallet required to securely authenticate with DEMS using blockchain signatures.
                </p>
                <button
                  type="button"
                  onClick={() => setShowMetaMaskHelp(!showMetaMaskHelp)}
                  className="text-xs text-sky-300 hover:text-sky-200 underline"
                >
                  {showMetaMaskHelp ? 'Hide' : 'Show'} installation instructions
                </button>
              </div>
            </div>

            {showMetaMaskHelp && (
              <div className="mt-4 pt-4 border-t border-amber-500/20">
                <h4 className="text-sm font-medium text-amber-300 mb-3">How to install MetaMask:</h4>
                <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
                  <li>Visit the official MetaMask website</li>
                  <li>Click "Install MetaMask for your browser"</li>
                  <li>Follow the installation instructions</li>
                  <li>Create a new wallet or import an existing one</li>
                  <li>Securely store your seed phrase</li>
                  <li>Unlock MetaMask when prompted</li>
                  <li>Return to this page and click "Connect Wallet"</li>
                </ol>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-sky-500/20 text-sky-300 rounded-lg hover:bg-sky-500/30 text-xs font-medium"
                >
                  <ExternalLink size={14} />
                  Install MetaMask
                </a>
              </div>
            )}
          </div>
        )}

        {isMetaMaskInstalled && currentNetwork && (
          <div className="mt-4 p-4 rounded-lg border border-sky-500/30 bg-sky-950/20">
            <div className="flex items-start gap-3">
              <Wallet className="text-sky-400 mt-1" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-sky-300 mb-2">Current Network</p>
                <p className="text-xs text-slate-400 mb-2">
                  Chain ID: {currentNetwork} (DEMS requires: 0x7a69 for localhost)
                </p>
                {currentNetwork !== '0x7a69' && currentNetwork !== '0xc353' && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await window.ethereum.request({
                          method: 'wallet_addEthereumChain',
                          params: [{
                            chainId: '0x7a69',
                            chainName: 'Hardhat Local',
                            nativeCurrency: {
                              name: 'ETH',
                              symbol: 'ETH',
                              decimals: 18
                            },
                            rpcUrls: ['http://127.0.0.1:8545']
                          }]
                        });
                      } catch (error) {
                        console.error('Failed to add network:', error);
                      }
                    }}
                    className="px-3 py-1.5 bg-sky-500/20 text-sky-300 rounded hover:bg-sky-500/30 text-xs font-medium"
                  >
                    Add Hardhat Local Network
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {loginSuccess && (
          <div className="mt-4 p-4 rounded-lg border border-green-500/30 bg-green-950/20">
            <p className="text-sm text-green-200">Login successful! Redirecting to dashboard...</p>
            <button
              onClick={() => navigate(dashboardPath(user?.role))}
              className="mt-2 text-xs text-green-300 hover:text-green-200 underline"
            >
              Continue to dashboard
            </button>
          </div>
        )}

        {authError ? (
          <div className="mt-4 border border-red-400/50 bg-red-950/30 p-3">
            <p className="text-sm text-red-200">{authError}</p>
            <button 
              onClick={() => setAuthError('')}
              className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}
        
        <button 
          className="btn-primary mt-6 w-full" 
          onClick={login} 
          disabled={busy || !isMetaMaskInstalled}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span className="ml-2">Authenticating...</span>
            </>
          ) : (
            <>
              <Wallet size={18} />
              <span className="ml-2">Connect Wallet</span>
            </>
          )}
        </button>
        
        {!isMetaMaskInstalled && (
          <p className="mt-3 text-xs text-center text-slate-500">
            Install MetaMask to continue
          </p>
        )}
      </div>
    </section>
  );
}
