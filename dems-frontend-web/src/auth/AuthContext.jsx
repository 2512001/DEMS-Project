import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { installAuthInterceptors } from '../api/client.js';
import { getMe, requestNonce, verifySignature } from '../api/auth.js';
import { connectMetaMask, ensureRequiredNetwork , getWalletState, REQUIRED_CHAIN_HEX  } from '../blockchain/wallet.js';

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
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const logout = useCallback(() => {
    tokenRef.current = '';
    setToken('');
    setUser(null);
    setWalletAddress('');
    localStorage.removeItem(STORAGE_KEY);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    installAuthInterceptors(
      () => tokenRef.current || readSavedAuth()?.token || '',
      logout
    );
  }, [logout]);

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
      const sessionWallet = user?.walletAddress?.toLowerCase();
      if (sessionWallet && nextAccount && nextAccount !== sessionWallet) {
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
    let mounted = true;
    // Only call getMe to refresh user data, not immediately after login
    // The initial user data comes from wallet authentication response
    if (token && user && !user.profile) {
      getMe()
        .then((freshUser) => {
          if (!mounted) return;
          console.log('[AUTH] /me response - role:', freshUser.role, 'organizationId:', freshUser.organizationId);
          setUser(freshUser);
        })
        .catch((error) => {
          console.error('[AUTH] /me failed:', error);
          if (error.response?.status === 401) {
            logout();
          }
        });
    }
    return () => { mounted = false; };
  }, [token, user, logout]);

  const loginWithWallet = useCallback(async () => {
    setAuthStatus('connecting');
    setAuthError('');
    try {
      console.log('[AUTH] Step 1: Ensure required network');
      await ensureRequiredNetwork();
      console.log('[AUTH] Step 2: Connect MetaMask');
      const signer = await connectMetaMask();
      const address = (await signer.getAddress()).toLowerCase();
      console.log('[AUTH] Step 3: Request nonce for', address);
      
      const nonce = await requestNonce(address);
      console.log('[AUTH] Step 4: Got nonce, requesting signature');
      
      const signature = await signer.signMessage(nonce.message);
      console.log('[AUTH] Step 5: Got signature, verifying with backend');
      
      const verified = await verifySignature({ walletAddress: address, signature });
      console.log('[AUTH] Step 6: Verification result:', verified);
      
      if (!verified || !verified.token || !verified.user) {
        throw new Error('Authentication failed: Invalid response from server');
      }
      
      console.log('[AUTH] Step 7: Setting auth state immediately');
      
      const authData = { token: verified.token, user: verified.user };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      tokenRef.current = verified.token;
      setToken(verified.token);
      setUser(verified.user);
      setWalletAddress(verified.user.walletAddress);
      setChainId(REQUIRED_CHAIN_HEX);
      setAuthStatus('authenticated');
      
      console.log('[AUTH] Step 8: Authentication complete, role:', verified.user.role, 'emailVerified:', verified.user.profile?.emailVerified);
      console.log('[AUTH] Final auth state - token:', !!verified.token, 'user:', !!verified.user, 'role:', verified.user.role);
      
      // Return immediately after setting state
      return verified;
    } catch (error) {
      console.error('[AUTH] Authentication error:', error);
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
    isSepolia: chainId === REQUIRED_CHAIN_HEX ,
    authStatus,
    authError,
    setAuthError,
    loginWithWallet,
    logout,
    refreshUser,
    forceSepolia: ensureRequiredNetwork
  }), [token, user, walletAddress, chainId, authStatus, authError, loginWithWallet, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
