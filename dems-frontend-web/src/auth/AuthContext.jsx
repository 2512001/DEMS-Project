import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { installAuthInterceptors } from '../api/client.js';
import { getMe, requestNonce, verifySignature } from '../api/auth.js';
import { connectMetaMask, ensureSepolia, getWalletState, SEPOLIA_CHAIN_HEX } from '../blockchain/wallet.js';

const STORAGE_KEY = 'dems.auth';
const AuthContext = createContext(null);

function readSavedAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => readSavedAuth()?.token || '');
  const [user, setUser] = useState(() => readSavedAuth()?.user || null);
  const [walletAddress, setWalletAddress] = useState(() => readSavedAuth()?.user?.walletAddress || '');
  const [chainId, setChainId] = useState(null);
  const [authStatus, setAuthStatus] = useState('idle');
  const [authError, setAuthError] = useState('');

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    setWalletAddress('');
    localStorage.removeItem(STORAGE_KEY);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    installAuthInterceptors(() => token, logout);
  }, [token, logout]);

  useEffect(() => {
    if (!token || !user) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  }, [token, user]);

  useEffect(() => {
    let mounted = true;
    getWalletState().then(({ accounts, chainId: currentChain }) => {
      if (!mounted) return;
      setChainId(currentChain);
      if (accounts?.[0]) setWalletAddress(accounts[0].toLowerCase());
    }).catch(() => { });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = (accounts) => {
      const nextAccount = accounts?.[0]?.toLowerCase() || '';
      setWalletAddress(nextAccount);
      if (!nextAccount || (user?.walletAddress && nextAccount !== user.walletAddress.toLowerCase())) {
        logout();
      }
    };

    const handleChainChanged = (nextChainId) => setChainId(nextChainId);

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [logout, user?.walletAddress]);

  useEffect(() => {
    if (!token) return;
    getMe()
      .then((freshUser) => setUser(freshUser))
      .catch(() => logout());
  }, [token, logout]);

  const loginWithWallet = useCallback(async () => {
    setAuthStatus('connecting');
    setAuthError('');
    try {
      await ensureSepolia();
      const signer = await connectMetaMask();
      const address = (await signer.getAddress()).toLowerCase();
      const nonce = await requestNonce(address);
      const signature = await signer.signMessage(nonce.message);
      const verified = await verifySignature({ walletAddress: address, signature });
      setToken(verified.token);
      setUser(verified.user);
      setWalletAddress(verified.user.walletAddress);
      setChainId(SEPOLIA_CHAIN_HEX);
      setAuthStatus('authenticated');
      return verified;
    } catch (error) {
      setAuthStatus('error');
      setAuthError(error.message || 'Wallet authentication failed.');
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const freshUser = await getMe();
    setUser(freshUser);
    return freshUser;
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    role: user?.role,
    walletAddress,
    chainId,
    isAuthenticated: Boolean(token && user),
    isSepolia: chainId === SEPOLIA_CHAIN_HEX,
    authStatus,
    authError,
    loginWithWallet,
    logout,
    refreshUser,
    forceSepolia: ensureSepolia
  }), [token, user, walletAddress, chainId, authStatus, authError, loginWithWallet, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
