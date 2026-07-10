import React from 'react';
import { ethers } from 'ethers';

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CHAIN_HEX = '0xaa36a7';

export const REQUIRED_CHAIN_ID = Number(
  import.meta.env.VITE_REQUIRED_CHAIN_ID || 31337
);

export const REQUIRED_CHAIN_HEX =
  `0x${REQUIRED_CHAIN_ID.toString(16)}`;

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

export async function ensureSepolia() {
  if (!hasMetaMask()) {
    throw new Error('MetaMask is required.');
  }

  const REQUIRED_CHAIN_ID = Number(
    import.meta.env.VITE_REQUIRED_CHAIN_ID || 31337
  );

  const REQUIRED_CHAIN_HEX =
    `0x${REQUIRED_CHAIN_ID.toString(16)}`;

  const currentChainId = await window.ethereum.request({
    method: 'eth_chainId'
  });

  if (currentChainId === REQUIRED_CHAIN_HEX) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: REQUIRED_CHAIN_HEX }]
    });
  } catch (error) {

    if (error.code !== 4902) throw error;

    if (REQUIRED_CHAIN_ID === 31337) {
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
      return;
    }

    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0xaa36a7',
        chainName: 'Sepolia Testnet',
        nativeCurrency: {
          name: 'Sepolia ETH',
          symbol: 'ETH',
          decimals: 18
        },
        rpcUrls: ['https://rpc.sepolia.org'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      }]
    });
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
