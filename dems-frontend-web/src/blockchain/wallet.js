import { ethers } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_HEX = '0xaa36a7';

export const REQUIRED_CHAIN_ID = Number(
  import.meta.env.VITE_REQUIRED_CHAIN_ID || import.meta.env.VITE_CHAIN_ID || 31337
);

export const REQUIRED_CHAIN_HEX = `0x${REQUIRED_CHAIN_ID.toString(16)}`;

const CHAIN_NAMES = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Test Network',
  31337: 'Hardhat Local',
  1337: 'Local Development'
};

/** Human-readable label for a chain id, as reported by MetaMask (hex) or config. */
export function chainLabel(chainId) {
  if (!chainId) return 'Network unknown';
  const numeric = typeof chainId === 'string'
    ? (chainId.startsWith('0x') ? parseInt(chainId, 16) : Number(chainId))
    : Number(chainId);
  if (!Number.isFinite(numeric)) return 'Network unknown';
  return CHAIN_NAMES[numeric] || `Chain ${numeric}`;
}

export const REQUIRED_NETWORK_LABEL = chainLabel(REQUIRED_CHAIN_ID);


const LOCAL_RPC_URLS = ['http://127.0.0.1:8545', 'http://localhost:8545'];

export function hasMetaMask() {
  return Boolean(window.ethereum);
}

export function getBrowserProvider() {
  if (!hasMetaMask()) {
    throw new Error('MetaMask is required.');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function connectMetaMask() {
  const provider = getBrowserProvider();
  await provider.send('eth_requestAccounts', []);
  return provider.getSigner();
}

function localNetworkParams(chainHex) {
  return {
    chainId: chainHex,
    chainName: 'Hardhat Local',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: LOCAL_RPC_URLS
  };
}

function sepoliaNetworkParams() {
  return {
    chainId: SEPOLIA_CHAIN_HEX,
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia ETH',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  };
}

async function currentChainId() {
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  // MetaMask returns the chain ID with or without 0x prefix
  // We need to return it in lowercase without double 0x
  let formatted = String(chainId).toLowerCase();
  if (formatted.startsWith('0x0x')) {
    formatted = formatted.slice(2);
  } else if (!formatted.startsWith('0x')) {
    formatted = '0x' + formatted;
  }
  return formatted;
}

export async function ensureRequiredNetwork() {
  if (!hasMetaMask()) {
    throw new Error('MetaMask is required.');
  }

  const requiredHex = REQUIRED_CHAIN_HEX.toLowerCase();
  const current = await currentChainId();

  console.log('[Network Diagnostics]', {
    requiredChainId: REQUIRED_CHAIN_ID,
    requiredChainHex: requiredHex,
    currentChainId: current,
    chainLabel: chainLabel(current),
    requiredChainLabel: REQUIRED_NETWORK_LABEL
  });

  if (current === requiredHex) {
    console.log('[Network Diagnostics] Already on correct network');
    return;
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: requiredHex }]
    });
  } catch (error) {
    if (error.code === 4902) {
      const params = REQUIRED_CHAIN_ID === 31337
        ? localNetworkParams(requiredHex)
        : sepoliaNetworkParams();

      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [params]
      });

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: requiredHex }]
        });
      } catch {
        // addEthereumChain often already switches
      }
    } else if (error.code === 4001) {
      throw new Error(`Switch MetaMask to chain ${REQUIRED_CHAIN_ID} to continue.`);
    } else {
      throw new Error(
        `Failed to switch network: ${error.message}. Switch MetaMask to chain ${REQUIRED_CHAIN_ID} (${requiredHex}).`
      );
    }
  }

  const after = await currentChainId();
  console.log('[Network Diagnostics] After switch:', { after, requiredHex, match: after === requiredHex });

  if (after !== requiredHex) {
    throw new Error(
      `MetaMask is still on ${after}. Switch to Hardhat Local (chain ${REQUIRED_CHAIN_ID}) and try again.`
    );
  }
}

export async function getWalletState() {
  if (!hasMetaMask()) return { accounts: [], chainId: null };
  const [accounts, chainId] = await Promise.all([
    window.ethereum.request({ method: 'eth_accounts' }),
    window.ethereum.request({ method: 'eth_chainId' })
  ]);
  return { accounts, chainId };
}
