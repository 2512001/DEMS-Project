import React from 'react';
import { ethers } from 'ethers';
import { evidenceRegistryAbi } from '../abis/EvidenceRegistryAbi.js';
import { ensureRequiredNetwork , getBrowserProvider } from './wallet.js';



export const EVIDENCE_CONTRACT_ADDRESS = import.meta.env.VITE_EVIDENCE_CONTRACT_ADDRESS || '';

console.log(EVIDENCE_CONTRACT_ADDRESS);

async function retryOperation(operation, maxRetries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isRpcError = error.code === -32002 || 
                        error.message?.includes('too many errors') ||
                        error.message?.includes('RPC endpoint');
      
      if (isRpcError && attempt < maxRetries) {
        console.warn(`RPC error detected, retrying attempt ${attempt}/${maxRetries} in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

export async function addEvidenceOnChain(payload) {
  if (!EVIDENCE_CONTRACT_ADDRESS) {
    throw new Error('VITE_EVIDENCE_CONTRACT_ADDRESS is required before writing to Sepolia.');
  }

  await ensureRequiredNetwork();
  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  const wallet = await signer.getAddress();
  const contract = new ethers.Contract(EVIDENCE_CONTRACT_ADDRESS, evidenceRegistryAbi, signer);
  const aiScore = Math.round(Number(payload.aiScore || 0) * 100);

  console.log("payload.uploaderWallet =", payload.uploaderWallet);
  console.log("connected wallet =", wallet);

  const tx = await retryOperation(async () => {
    try {
      return await contract.addEvidence(
        payload.evidenceId,
        payload.fileHash,
        payload.ipfsCID,
        aiScore,
        wallet
      );
    } catch (error) {
      const raw = `${error?.shortMessage || ''} ${error?.reason || ''} ${error?.message || ''}`.toLowerCase();
      if (raw.includes('filehashalreadyexists') || raw.includes('file hash already exists')) {
        throw new Error('This blockchain proof already exists for this file.');
      }
      if (raw.includes('evidencealreadyexists') || raw.includes('already exists')) {
        throw new Error('This blockchain proof already exists for this file.');
      }
      throw error;
    }
  });

  const receipt = await tx.wait();
  return { txHash: tx.hash, receipt };
}
