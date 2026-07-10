import React from 'react';
import { ethers } from 'ethers';
import { evidenceRegistryAbi } from '../abis/EvidenceRegistryAbi.js';
import { ensureSepolia, getBrowserProvider } from './wallet.js';



export const EVIDENCE_CONTRACT_ADDRESS = import.meta.env.VITE_EVIDENCE_CONTRACT_ADDRESS || '';

console.log(EVIDENCE_CONTRACT_ADDRESS);

export async function addEvidenceOnChain(payload) {
  if (!EVIDENCE_CONTRACT_ADDRESS) {
    throw new Error('VITE_EVIDENCE_CONTRACT_ADDRESS is required before writing to Sepolia.');
  }

  await ensureSepolia();
  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  const wallet = await signer.getAddress();
  const contract = new ethers.Contract(EVIDENCE_CONTRACT_ADDRESS, evidenceRegistryAbi, signer);
  const aiScore = Math.round(Number(payload.aiScore || 0) * 100);

  console.log("payload.uploaderWallet =", payload.uploaderWallet);
console.log("connected wallet =", wallet);

 const tx = await contract.addEvidence(
  payload.evidenceId,
  payload.fileHash,
  payload.ipfsCID,
  aiScore,
  wallet
);

  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}
