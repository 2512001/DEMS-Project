# DEMS Smart Contracts — EvidenceRegistry

Production-grade immutable integrity layer for the **Decentralized Evidence Management System (DEMS)**.

The blockchain stores **only cryptographic proof** — never files, GPS, device metadata, or AI reports. Those remain in MongoDB and IPFS per `PROJECT_CONTEXT.md`.

---

## Table of Contents

1. [Architecture Diagram](#1-architecture-diagram)
2. [Storage Design](#2-storage-design)
3. [Security Review](#3-security-review)
4. [Gas Optimization Strategy](#4-gas-optimization-strategy)
5. [Quick Start (Local)](#5-quick-start-local)
6. [Testnet Deployment](#6-testnet-deployment)
7. [Contract API](#7-contract-api)
8. [Frontend Integration](#8-frontend-integration)
9. [Testing](#9-testing)

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEMS EVIDENCE PIPELINE                              │
└─────────────────────────────────────────────────────────────────────────────┘

 Officer (MetaMask)                React Frontend                 Node.js Backend
       │                                │                                │
       │  1. Capture media + GPS        │                                │
       │───────────────────────────────>│  POST /api/evidence/upload     │
       │                                │───────────────────────────────>│
       │                                │                                │ SHA-256(raw file)
       │                                │                                │ Mock AI analysis
       │                                │                                │ AES-256 encrypt
       │                                │                                │ Pinata → ipfsCID
       │                                │                                │ MongoDB (pending)
       │                                │<───────────────────────────────│
       │                                │  { evidenceId, fileHash,       │
       │                                │    ipfsCID, aiScore }          │
       │  2. MetaMask sign tx           │                                │
       │<───────────────────────────────│  addEvidence()                 │
       │                                │                                │
       ▼                                ▼                                │
 ┌──────────────┐              ┌─────────────────┐                        │
 │  MetaMask    │              │ EvidenceRegistry│                        │
 │  (Signer)    │─────────────>│ Smart Contract  │                        │
 └──────────────┘   tx write  └────────┬────────┘                        │
                                       │ immutable proof                  │
                                       ▼                                  │
                              ┌─────────────────┐                         │
                              │ evidenceId      │                         │
                              │ fileHash        │                         │
                              │ ipfsCID         │                         │
                              │ aiScore         │                         │
                              │ timestamp       │                         │
                              │ uploaderWallet  │                         │
                              └─────────────────┘                         │
       │                                │  POST finalize + txHash       │
       │                                │───────────────────────────────>│
       │                                │                                │ status=stored_on_chain

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   MongoDB    │    │    IPFS      │    │  Blockchain  │    │  MetaMask    │
│  (metadata)  │    │ (encrypted   │    │  (proof only)│    │  (auth/sign) │
│              │    │   blob)      │    │              │    │              │
│ GPS, IMEI    │    │ AES-256 file │    │ fileHash     │    │ Officer role │
│ AI reports   │    │              │    │ ipfsCID      │    │ Gas payer    │
│ txHash       │    │              │    │ aiScore      │    │              │
│ RBAC roles   │    │              │    │ custody log  │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

### Role Flow

```
DEFAULT_ADMIN_ROLE (deployer/admin)
        │
        ├── grantOfficer(wallet)  ──> OFFICER_ROLE
        │                              │
        │                              ├── addEvidence()
        │                              └── addCustodyEvent()
        │
        └── revokeOfficer(wallet)
```

---

## 2. Storage Design

### On-Chain (EvidenceRegistry.sol)

| Field | Type | Purpose |
|-------|------|---------|
| `evidenceId` | `string` | MongoDB `_id` reference |
| `fileHash` | `string` | SHA-256 of **raw** file (pre-encryption) |
| `ipfsCID` | `string` | Pointer to encrypted blob on IPFS |
| `aiScore` | `uint256` | Score × 100 (98.5 → 9850) |
| `timestamp` | `uint256` | Block time at registration |
| `uploaderWallet` | `address` | Officer wallet (`msg.sender`) |

### Internal Indexes (bytes32 keys)

| Mapping | Key | Purpose |
|---------|-----|---------|
| `_evidenceById` | `keccak256(evidenceId)` | Primary evidence store |
| `_evidenceIdExists` | `keccak256(evidenceId)` | O(1) duplicate ID check |
| `_fileHashExists` | `keccak256(fileHash)` | O(1) duplicate hash check |
| `_uploaderEvidenceCount` | `address` | Per-officer upload stats |
| `_custodyHistory` | `keccak256(evidenceId)` | Append-only custody array |

### Off-Chain (NOT on blockchain)

- GPS coordinates, IMEI, device fingerprint
- Full AI analysis reports
- Encrypted media files
- User profiles, case notes, admin documents

---

## 3. Security Review

| Threat | Mitigation |
|--------|------------|
| Unauthorized evidence registration | OpenZeppelin `AccessControl` — `OFFICER_ROLE` required |
| Wallet spoofing | `uploaderWallet` param must equal `msg.sender` |
| Duplicate evidence injection | Separate checks for `evidenceId` and `fileHash` |
| Replay of same file under new ID | `_fileHashExists` mapping blocks re-registration |
| Privilege escalation | Only `DEFAULT_ADMIN_ROLE` can grant/revoke officers |
| Zero-address admin/officer | `InvalidInput` revert on zero address |
| Empty/malformed inputs | Validated before state writes |
| Hidden admin backdoors | No owner-only shortcuts; standard OZ AccessControl only |
| Backend signing txs | **Not supported** — all writes via MetaMask (per PROJECT_CONTEXT) |
| Reentrancy | No external calls during state mutations; not vulnerable |
| String key griefing | Keys hashed to `bytes32` — no unbounded string mapping keys |

### Audit Notes

- Custody `action` strings are officer-supplied labels; canonical values (`UPLOAD`, `VERIFIED`, `VIEWED`, `TRANSFERRED`) should be enforced at the application layer.
- `aiScore` scaling (×100) must be consistent between backend, frontend, and verification UI.
- On-chain officer roles are **independent** of MongoDB RBAC — admin must grant both DB role and on-chain role.

---

## 4. Gas Optimization Strategy

| Technique | Application |
|-----------|-------------|
| **`calldata` params** | All external string inputs use `calldata` (cheaper than `memory`) |
| **Custom errors** | Replace revert strings — saves deployment + revert gas |
| **`bytes32` mapping keys** | Hash `evidenceId`/`fileHash` once; avoid string-key mappings |
| **Indexed events** | `evidenceId`, `uploaderWallet`, `actor` indexed for efficient log filtering |
| **Solidity optimizer** | 200 runs + `viaIR` for balanced deploy/runtime cost |
| **`unchecked` increment** | Upload counter increment (no overflow risk in practice) |
| **Minimal on-chain data** | Only 6 proof fields — no GPS/AI blobs on-chain |
| **View verification** | `verifyEvidence()` is `view` — free off-chain reads via RPC |

**Trade-off:** Dynamic strings (`evidenceId`, `fileHash`, `ipfsCID`) dominate registration gas. This is acceptable — registration is a one-time forensic anchor, not a high-frequency operation.

---

## 5. Quick Start (Local)

### Prerequisites

- Node.js 18+
- MetaMask

### Install & Compile

```bash
cd dems-smart-contracts
npm install
npx hardhat compile
npx hardhat test
```

### Run Local Node + Deploy

Terminal 1:

```bash
npx hardhat node
```

Terminal 2:

```bash
npx hardhat run scripts/deploy-local.ts --network localhost
```

This automatically exports:

- `dems-frontend-web/src/contracts/EvidenceRegistry.json`
- `dems-frontend-web/src/abis/EvidenceRegistryAbi.js`

### Configure Frontend

Update `dems-frontend-web/.env`:

```env
VITE_EVIDENCE_CONTRACT_ADDRESS=<deployed address>
VITE_CHAIN_ID=31337
VITE_REQUIRED_CHAIN_ID=31337
```

Add Hardhat local network in MetaMask:

| Field | Value |
|-------|-------|
| Network Name | Hardhat Local |
| RPC URL | `http://127.0.0.1:8545` |
| Chain ID | `31337` |
| Currency | ETH |

Import Hardhat account #1 (officer) private key from `npx hardhat node` output.

---

## 6. Testnet Deployment

Copy `.env.example` → `.env` and fill in:

```env
PRIVATE_KEY=
SEPOLIA_RPC_URL=
AMOY_RPC_URL=
ETHERSCAN_API_KEY=
POLYGONSCAN_API_KEY=
```

Deploy:

```bash
# Sepolia (chainId: 11155111)
npm run deploy:sepolia

# Polygon Amoy (chainId: 80002)
npm run deploy:amoy
```

After deployment, grant `OFFICER_ROLE` to officer wallets:

```bash
npx hardhat console --network sepolia
> const registry = await ethers.getContractAt("EvidenceRegistry", "<ADDRESS>")
> await registry.grantOfficer("<OFFICER_WALLET>")
```

---

## 7. Contract API

### Evidence

| Function | Access | Description |
|----------|--------|-------------|
| `addEvidence(id, hash, cid, score, wallet)` | Officer | Register immutable proof |
| `getEvidence(id)` | Public view | Return stored evidence |
| `verifyEvidence(id)` | Public view | Return integrity data for hash comparison |
| `evidenceExists(id)` | Public view | Existence check |
| `getUploaderEvidenceCount(wallet)` | Public view | Officer upload count |

### Chain of Custody

| Function | Access | Description |
|----------|--------|-------------|
| `addCustodyEvent(id, action)` | Officer | Append custody record |
| `getCustodyHistory(id)` | Public view | Full custody timeline |

### Access Control

| Function | Access | Description |
|----------|--------|-------------|
| `grantOfficer(address)` | Admin | Grant `OFFICER_ROLE` |
| `revokeOfficer(address)` | Admin | Revoke `OFFICER_ROLE` |
| `hasOfficerRole(address)` | Public view | Role check |

### Events

- `EvidenceAdded`
- `EvidenceVerified` (emitted on `VERIFIED` custody action)
- `CustodyEventAdded`
- `OfficerGranted`
- `OfficerRevoked`

---

## 8. Frontend Integration

See `examples/frontend-integration.ts` for Ethers.js v6 patterns:

- MetaMask connect
- Contract initialization
- `addEvidence()` with score scaling
- `getEvidence()` / `verifyEvidence()`
- Custody event logging

The existing `dems-frontend-web/src/blockchain/evidenceContract.js` is compatible — it already calls `addEvidence` with the same signature and scales `aiScore × 100`.

---

## 9. Testing

```bash
npx hardhat test
npx hardhat coverage   # optional
REPORT_GAS=true npx hardhat test
```

### Coverage Targets

- ✅ Evidence registration
- ✅ Duplicate `evidenceId` rejection
- ✅ Duplicate `fileHash` rejection
- ✅ Role grant / revoke
- ✅ Custody events + `VERIFIED` emission
- ✅ Permission checks (non-officer, non-admin)
- ✅ Evidence retrieval & existence
- ✅ Input validation & uploader mismatch

---

## Chain IDs

| Network | Chain ID |
|---------|----------|
| Hardhat Local | `31337` |
| Sepolia | `11155111` |
| Polygon Amoy | `80002` |

---

## License

MIT
