# DEMS Frontend

React 19 + Vite frontend for the Decentralized Evidence Management System.

## Run

```bash
pnpm install
pnpm dev
```

Set environment values in `.env`:

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000/api
VITE_EVIDENCE_CONTRACT_ADDRESS=
VITE_REQUIRED_CHAIN_ID=11155111
```

## Folder Structure

- `src/api` Axios API layer matching backend routes
- `src/auth` wallet/JWT AuthContext
- `src/blockchain` MetaMask, Sepolia, ethers v6 services
- `src/abis` smart-contract interface
- `src/components` shared secure-vault UI
- `src/layouts` public and protected shells
- `src/pages/public` landing, about, features
- `src/pages/auth` wallet login
- `src/pages/citizen` dashboard, vault, details, profile
- `src/pages/officer` dashboard, upload, custody, tracking
- `src/pages/admin` dashboard, approvals, users, audit logs
- `docs/COMPATIBILITY_REPORT.md` actual backend API contract

## Architecture

```mermaid
flowchart LR
  UI["React 19 + Router + Query"] --> API["Axios API Layer"]
  UI --> MM["MetaMask"]
  API --> BE["Express API Gateway"]
  BE --> DB["MongoDB"]
  BE --> IPFS["Pinata/IPFS"]
  BE --> AI["Mock AI Verification"]
  MM --> SEP["Sepolia Contract"]
```

## Wallet Login Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend
  participant M as MetaMask
  participant B as Backend
  U->>F: Connect Wallet
  F->>M: eth_requestAccounts
  F->>B: GET /api/auth/nonce/:walletAddress
  B-->>F: nonce + message
  F->>M: signer.signMessage(message)
  M-->>F: signature
  F->>B: POST /api/auth/verify
  B-->>F: JWT + role + walletAddress
```

## Evidence Upload Sequence

```mermaid
sequenceDiagram
  participant O as Officer
  participant F as Frontend
  participant B as Backend
  participant M as MetaMask
  participant C as Sepolia Contract
  O->>F: Select file + metadata
  F->>B: POST /api/evidence/upload
  B-->>F: evidenceId, fileHash, ipfsCID, aiScore
  F->>M: Confirm transaction
  M->>C: addEvidence(...)
  C-->>F: receipt
  F->>B: POST /api/evidence/finalize/:evidenceId
  B-->>F: stored_on_chain
```
