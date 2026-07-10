# DEMS Backend Compatibility Report

Generated from the Express routes, controllers, middleware, Mongoose models, JWT logic, RBAC logic, evidence APIs, and available smart-contract assets in this workspace.

## Mounted Routers

`App.js` mounts:

- `/api/auth` -> `routes/authRoutes.js`
- `/api/admin` -> `routes/adminRoutes.js`
- `/api/evidence` -> `routes/evidenceRoutes.js`
- `/api/Evidence` -> `routes/evidenceRoutes.js` legacy duplicate

## API Surface

| Route path | Request body | Response body | Auth requirements | Role requirements |
| --- | --- | --- | --- | --- |
| `GET /api/auth/nonce/:walletAddress` | none. `walletAddress` path param must be a valid EVM address. | `{ success, walletAddress, nonce, message }` where `message` is `DEMS authentication nonce: ${nonce}`. | none | public |
| `POST /api/auth/verify` | JSON `{ walletAddress, signature }`. Signature must be `0x...` and recover the wallet from the nonce message. | `{ success, token, user: { id, role, walletAddress } }` | none | public |
| `GET /api/auth/me` | none | `{ success, user }` with profile and officer verification fields. | `Authorization: Bearer <JWT>` | any authenticated user |
| `PUT /api/auth/profile` | JSON `{ displayName, email }` | `{ success, message, user }` | `Authorization: Bearer <JWT>` | any authenticated user |
| `POST /api/evidence/upload` | `multipart/form-data`: `evidence` file, `caseId`, `captureMetadata` JSON string `{ deviceInfo, gpsLocation: { latitude, longitude }, capturedAt }`. | `201 { success, message, data: { evidenceId, fileName, fileHash, ipfsCID, status, statusMessage, aiAnalysis, blockchainPayload? } }` | `Authorization: Bearer <JWT>` | `citizen`, `officer`, `admin`. Officer/admin receive `pending_blockchain` and `blockchainPayload`; citizen receives `encrypted`. |
| `POST /api/evidence/finalize/:evidenceId` | JSON `{ txHash }`, 66-char `0x` transaction hash. | `{ success, message, data }` with status `stored_on_chain`. | `Authorization: Bearer <JWT>` | `officer`, `admin`. Non-admin must own the evidence wallet. |
| `GET /api/evidence/my-files` | none | `{ success, count, data: Evidence[] }` | `Authorization: Bearer <JWT>` | `citizen`, `officer`, `admin` |
| `GET /api/evidence/case/:caseId` | none. `caseId` max length 120. | `{ success, count, data: Evidence[] }` | `Authorization: Bearer <JWT>` | `officer`, `admin` |
| `POST /api/admin/verification-request` | `multipart/form-data`: `badgeNumber`, `governmentIdNumber`, `aadhaarNumber`, files `badge`, `governmentId`, `aadhaar`, optional multi `supportingDocuments`. | `201 { success, message, user }` | `Authorization: Bearer <JWT>` | `citizen`, `officer`, `admin` |
| `GET /api/admin/verification-requests` | none | `{ success, count, data: User[] }` pending requests only. | `Authorization: Bearer <JWT>` | `admin` |
| `POST /api/admin/verification-requests/review` | JSON `{ walletAddress, status, rejectionReason? }`, status is `approved` or `rejected`. | `{ success, message, user }` | `Authorization: Bearer <JWT>` | `admin` |
| `GET /api/admin/users` | none | `{ success, count, data: User[] }` | `Authorization: Bearer <JWT>` | `admin` |
| `GET /api/admin/audit-logs` | none | `{ success, count, data }` merged user/evidence events. | `Authorization: Bearer <JWT>` | `admin` |
| `POST /api/admin/upgrade-officer` | JSON `{ walletAddress }` | `{ success, message, user }` | `Authorization: Bearer <JWT>` | `admin` |

## JWT Logic

`protect` requires `Authorization: Bearer <token>`, verifies with `JWT_SECRET`, loads the user by decoded `id`, and attaches `req.user = { id, role, walletAddress }`. Expired or invalid tokens return `401 { success:false, message:'Invalid or expired authentication token.' }`.

## RBAC Logic

`authorizeRoles(...roles)` requires `req.user` and denies non-matching roles with `403 { success:false, message:'You are not authorized to access this resource.' }`.

## Evidence Model Response Shape

Evidence records include `_id`, `user`, `UploaderWallet`, `uploaderWallet`, `caseId`, `captureMetadata`, `fileName`, `mimeType`, `fileSize`, `fileHash`, `ipfsCID`, `encryption`, `blockchainTxHash`, `aiAnalysis`, `status`, `statusMessage`, `createdAt`, and `updatedAt`.

## Smart Contract ABI Availability

The `dems-smart-contracts` folder currently contains only `.gitkeep`; no compiled ABI artifact was present. The frontend therefore stores the requested interface in `src/abis/EvidenceRegistryAbi.js`:

`addEvidence(string evidenceId,string fileHash,string ipfsCID,uint256 aiScore,address uploaderWallet)`

The contract address must be supplied with `VITE_EVIDENCE_CONTRACT_ADDRESS`.
