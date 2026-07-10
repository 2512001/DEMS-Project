/**
 * DEMS EvidenceRegistry — Ethers.js v6 Frontend Integration Examples
 *
 * Copy patterns into dems-frontend-web/src/blockchain/ as needed.
 * Requires MetaMask. ALL writes are user-signed (never use PRIVATE_KEY in frontend).
 */
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";

// Import from auto-exported deployment artifact
import artifact from "../../dems-frontend-web/src/contracts/EvidenceRegistry.json";

const CHAIN_IDS = {
  localhost: 31337,
  sepolia: 11155111,
  amoy: 80002,
} as const;

// ---------------------------------------------------------------------------
// 1. MetaMask Connect
// ---------------------------------------------------------------------------
export async function connectMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required.");
  }

  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();

  return { provider, signer, address, chainId: Number(network.chainId) };
}

// ---------------------------------------------------------------------------
// 2. Contract Initialization
// ---------------------------------------------------------------------------
export async function getEvidenceRegistryContract() {
  const { provider, signer, chainId } = await connectMetaMask();

  const expectedChainId =
    Number(import.meta.env.VITE_CHAIN_ID || import.meta.env.VITE_REQUIRED_CHAIN_ID) || CHAIN_IDS.sepolia;

  if (chainId !== expectedChainId) {
    throw new Error(`Wrong network. Expected ${expectedChainId}, got ${chainId}.`);
  }

  const address = import.meta.env.VITE_EVIDENCE_CONTRACT_ADDRESS || artifact.address;
  const contract = new Contract(address, artifact.abi, signer);

  return { contract, signer, provider };
}

// ---------------------------------------------------------------------------
// 3. addEvidence() — Golden Pipeline Step 8
// ---------------------------------------------------------------------------
export async function registerEvidenceOnChain(payload: {
  evidenceId: string;
  fileHash: string;
  ipfsCID: string;
  aiScore: number; // e.g. 98.5 from backend mock AI
  uploaderWallet: string;
}) {
  const { contract, signer } = await getEvidenceRegistryContract();
  const officerAddress = await signer.getAddress();

  if (payload.uploaderWallet.toLowerCase() !== officerAddress.toLowerCase()) {
    throw new Error("Connected wallet must match uploaderWallet.");
  }

  // Store score * 100 on-chain (98.5 -> 9850)
  const scaledScore = BigInt(Math.round(payload.aiScore * 100));

  const tx = await contract.addEvidence(
    payload.evidenceId,
    payload.fileHash,
    payload.ipfsCID,
    scaledScore,
    officerAddress
  );

  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}

// ---------------------------------------------------------------------------
// 4. getEvidence()
// ---------------------------------------------------------------------------
export async function fetchOnChainEvidence(evidenceId: string) {
  const { contract } = await getEvidenceRegistryContract();
  const record = await contract.getEvidence(evidenceId);

  return {
    evidenceId: record[0],
    fileHash: record[1],
    ipfsCID: record[2],
    aiScore: Number(record[3]) / 100,
    timestamp: new Date(Number(record[4]) * 1000).toISOString(),
    uploaderWallet: record[5],
  };
}

// ---------------------------------------------------------------------------
// 5. verifyEvidence() — Backend compares returned fileHash with fresh SHA-256
// ---------------------------------------------------------------------------
export async function fetchIntegrityProof(evidenceId: string) {
  const { contract } = await getEvidenceRegistryContract();
  const proof = await contract.verifyEvidence(evidenceId);

  return {
    evidenceId: proof[0],
    fileHash: proof[1],
    ipfsCID: proof[2],
    aiScore: Number(proof[3]) / 100,
    timestamp: Number(proof[4]),
    uploaderWallet: proof[5],
  };
}

// ---------------------------------------------------------------------------
// 6. Chain of Custody — log VERIFIED after backend hash match
// ---------------------------------------------------------------------------
export async function logVerificationCustodyEvent(evidenceId: string) {
  const { contract } = await getEvidenceRegistryContract();
  const tx = await contract.addCustodyEvent(evidenceId, "VERIFIED");
  return tx.wait();
}

// ---------------------------------------------------------------------------
// 7. Read-only helpers (no MetaMask write prompt)
// ---------------------------------------------------------------------------
export async function checkEvidenceExists(evidenceId: string) {
  const { contract } = await getEvidenceRegistryContract();
  return contract.evidenceExists(evidenceId);
}

export async function getOfficerUploadCount(wallet: string) {
  const { contract } = await getEvidenceRegistryContract();
  return contract.getUploaderEvidenceCount(wallet);
}

declare global {
  interface Window {
    ethereum?: import("ethers").Eip1193Provider;
  }
}

export { CHAIN_IDS, formatUnits, parseUnits };
