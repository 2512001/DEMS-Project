import { ethers } from 'ethers';
import { evidenceRegistryAbi } from '../abis/EvidenceRegistryAbi.js';
import { ensureRequiredNetwork, getBrowserProvider } from './wallet.js';

export const EVIDENCE_CONTRACT_ADDRESS = import.meta.env.VITE_EVIDENCE_CONTRACT_ADDRESS || '';

function scaleAiScore(raw) {
  const n = Number(raw || 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n <= 100) return Math.round(n * 100);
  return Math.round(n);
}

function extractErrorData(error) {
  return (
    error?.data ||
    error?.info?.error?.data ||
    error?.error?.data ||
    error?.receipt?.revertReason
  );
}

function explainChainError(error, contract) {
  const data = extractErrorData(error);
  if (data && contract) {
    try {
      const parsed = contract.interface.parseError(data);
      switch (parsed?.name) {
        case 'UploaderMismatch':
          return 'MetaMask is not using the same wallet that uploaded this evidence. Switch accounts and try again.';
        case 'InvalidInput':
          return 'On-chain metadata is incomplete. Evidence ID, file hash, and IPFS CID are required.';
        case 'EvidenceAlreadyExists':
          return 'This evidence ID is already registered on-chain.';
        case 'FileHashAlreadyExists':
          return 'This file hash is already registered on-chain.';
        case 'Unauthorized':
        case 'AccessControlUnauthorizedAccount':
          return 'This wallet is not allowed to write to the deployed contract. Use a funded Hardhat account, or redeploy EvidenceRegistry with open uploads.';
        case 'EvidenceNotFound':
          return 'Evidence was not found on-chain.';
        default:
          if (parsed?.name) return `Contract rejected the transaction (${parsed.name}).`;
      }
    } catch {
      // fall through to message parsing
    }
  }

  const raw = `${error?.shortMessage || ''} ${error?.reason || ''} ${error?.message || ''}`;
  const lower = raw.toLowerCase();

  if (lower.includes('user rejected') || error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
    return 'MetaMask transaction was rejected.';
  }
  if (lower.includes('insufficient funds')) {
    return 'Insufficient ETH for gas. Check that the selected MetaMask account is funded on the Hardhat Local network (chain 31337). Use the diagnostic info below to verify the connected wallet and balance.';
  }
  if (
    lower.includes('could not decode') ||
    lower.includes('bad_data') ||
    lower.includes('no contract') ||
    lower.includes('missing revert data')
  ) {
    return 'No EvidenceRegistry contract at this address on the current network. Start Hardhat on chain 31337, deploy EvidenceRegistry, and confirm VITE_EVIDENCE_CONTRACT_ADDRESS.';
  }
  if (lower.includes('filehashalreadyexists') || lower.includes('file hash already exists')) {
    return 'This blockchain proof already exists for this file.';
  }
  if (lower.includes('evidencealreadyexists') || lower.includes('already exists')) {
    return 'This blockchain proof already exists for this file.';
  }
  if (lower.includes('uploadermismatch')) {
    return 'MetaMask is not using the same wallet that uploaded this evidence. Switch accounts and try again.';
  }
  if (lower.includes('nonce')) {
    return 'MetaMask nonce is out of sync with the local node. Reset the account in MetaMask (Settings → Advanced → Reset account) and try again.';
  }
  if (lower.includes('circuit breaker') || lower.includes('too many errors')) {
    return 'MetaMask blocked the local RPC after repeated failures. Open MetaMask, switch away from Hardhat Local and back, then retry after the Hardhat node is running.';
  }

  return error?.shortMessage || error?.reason || error?.message || 'Blockchain transaction failed.';
}

function isKnownRevert(error, contract) {
  const data = extractErrorData(error);
  if (data && contract) {
    try {
      return Boolean(contract.interface.parseError(data)?.name);
    } catch {
      return false;
    }
  }
  const raw = `${error?.shortMessage || ''} ${error?.message || ''}`.toLowerCase();
  return (
    raw.includes('uploadermismatch') ||
    raw.includes('already exists') ||
    raw.includes('invalidinput') ||
    raw.includes('unauthorized')
  );
}

async function retryRpc(operation, maxRetries = 3, delayMs = 1500) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRpcError =
        error.code === -32002 ||
        error.code === -32603 ||
        String(error.message || '').toLowerCase().includes('too many errors') ||
        String(error.message || '').toLowerCase().includes('rpc endpoint') ||
        String(error.message || '').toLowerCase().includes('network error');

      if (!isRpcError || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
  throw lastError;
}

export async function addEvidenceOnChain(payload) {
  if (!EVIDENCE_CONTRACT_ADDRESS || !ethers.isAddress(EVIDENCE_CONTRACT_ADDRESS)) {
    throw new Error('VITE_EVIDENCE_CONTRACT_ADDRESS is missing or invalid.');
  }

  const evidenceId = String(payload?.evidenceId || '').trim();
  const fileHash = String(payload?.fileHash || '').trim();
  const ipfsCID = String(payload?.ipfsCID || '').trim();
  const expectedUploader = String(payload?.uploaderWallet || payload?.UploaderWallet || '').trim();

  if (!evidenceId || !fileHash || !ipfsCID) {
    throw new Error('Blockchain payload is missing evidenceId, fileHash, or ipfsCID.');
  }

  await ensureRequiredNetwork();
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  const wallet = await signer.getAddress();

  // Diagnostic logging
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(wallet);
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });

  console.log('[Blockchain Diagnostics]', {
    configuredContractAddress: EVIDENCE_CONTRACT_ADDRESS,
    connectedWallet: wallet,
    expectedUploader,
    ethAccounts: accounts,
    providerChainId: Number(network.chainId),
    metamaskChainId: chainId,
    ethBalance: ethers.formatEther(balance),
    balanceRaw: balance.toString(),
    rpcUrl: provider._getConnection?.url || 'unknown'
  });

  if (expectedUploader && expectedUploader.toLowerCase() !== wallet.toLowerCase()) {
    throw new Error(
      `The MetaMask account does not match the evidence uploader. Please sign in to DEMS with the same wallet you used for this evidence.`
    );
  }

  if (balance === 0n) {
    throw new Error(
      `MetaMask account ${wallet} has 0 ETH on chain ${Number(network.chainId)}. Expected non-zero balance on Hardhat Local (31337). Check that this account is funded on the correct network.`
    );
  }

  const code = await provider.getCode(EVIDENCE_CONTRACT_ADDRESS);
  if (!code || code === '0x') {
    throw new Error(
      'No contract code at VITE_EVIDENCE_CONTRACT_ADDRESS on this network. Start Hardhat (`npx hardhat node`), deploy EvidenceRegistry, then update the frontend contract address.'
    );
  }

  const contract = new ethers.Contract(EVIDENCE_CONTRACT_ADDRESS, evidenceRegistryAbi, signer);
  const aiScore = scaleAiScore(payload.aiScore);
  const args = [evidenceId, fileHash, ipfsCID, aiScore, wallet];

  const isLocal = Number(network.chainId) === 31337;
  const overrides = {};

  try {
    await contract.addEvidence.staticCall(...args);
  } catch (error) {
    if (isKnownRevert(error, contract)) {
      throw new Error(explainChainError(error, contract));
    }
  }

  try {
    const gas = await contract.addEvidence.estimateGas(...args);
    overrides.gasLimit = (gas * 130n) / 100n;
  } catch (error) {
    if (isKnownRevert(error, contract)) {
      throw new Error(explainChainError(error, contract));
    }
    overrides.gasLimit = 800000n;
  }

  if (isLocal) {
    overrides.gasPrice = ethers.parseUnits('20', 'gwei');
  }

  let tx;
  try {
    tx = await retryRpc(async () => contract.addEvidence(...args, overrides));
  } catch (error) {
    throw new Error(explainChainError(error, contract));
  }

  const receipt = await tx.wait();
  if (receipt?.status === 0) {
    throw new Error('Blockchain transaction was mined but reverted.');
  }

  return { txHash: tx.hash, receipt };
}
