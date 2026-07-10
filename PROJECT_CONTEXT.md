PROJECT CONTEXT: Decentralized Evidence Management System (DEMS)

1. PROJECT OVERVIEW & NOVELTY

Title: Secure Decentralized Evidence Storage Using Multi-Level Encryption, Blockchain Integrity, and AI-Based Content Verification.
Objective: A high-security, tamper-proof platform for storing digital evidence to prevent fabrication and manipulation in legal/forensic systems.
Core Novelty:

Hybrid AI + Blockchain: AI validates media authenticity (deepfake detection), and Blockchain provides an immutable ledger.

Multi-Level Encryption: Files are encrypted (AES-256 + RSA) before decentralized storage (IPFS).

Zero-Trust Identity: 100% Web3 wallet-based authentication via MetaMask. No passwords.

2. TECH STACK & ARCHITECTURE (Microservices)

Rule: Do NOT mix these environments. Follow strict API separation.

Client/Frontend: React.js + Tailwind CSS + Ethers.js (MetaMask Integration).

API Gateway (Backend): Node.js + Express.js + Mongoose + JWT.

Database (Off-chain): MongoDB.

Storage (Decentralized): IPFS (via Pinata SDK) for encrypted blobs.

Blockchain (Ledger): Solidity Smart Contracts on Polygon/Sepolia.

AI Engine: Python + FastAPI (NOTE: Currently in MVP Phase. Use a MOCK AI RESPONSE dumy or fake  in the Node.js backend until the Python model is integrated).

3. UI/UX DESIGN GUIDELINES (The "High-Security Vault" Feel)

Aesthetic: Professional, military/government-grade, highly secure vault.

Colors: Do NOT use excessive, bright, or playful colors. Stick to a sleek dark mode palette (Slate/Gray/Black backgrounds, Sky Blue or Emerald Green for accents/success states, subtle borders).

Vibe: Users must instantly feel they are using a robust, tamper-proof system. Use mono-spaced fonts for Hashes/CIDs, and clean, minimal dashboard layouts.

4. AUTHENTICATION FLOW (Strict Web3 Standard)

Rule: NO PASSWORDS. All auth is MetaMask-based.

Nonce Request: Client requests a nonce for their walletAddress from /api/auth/nonce.

User Creation: If the wallet is new, the backend automatically creates a DB profile with role: 'citizen' and generates a nonce.

Signature: User signs the nonce via MetaMask (Personal Sign).

Verification: Backend verifies the signature using ethers.verifyMessage. If valid, it rotates the nonce (for security) and issues a JWT containing { id, role, walletAddress }.

5. ROLE-BASED ACCESS CONTROL (RBAC) & ADMIN FLOW

Every backend route MUST be protected by JWT and Role middlewares.

citizen (Normal User): Default role. Can view their own standard files. CANNOT access Live Capture or upload official evidence.

officer (Prime User): Upgraded by an admin. Has access to the "Live Capture" dashboard to upload court-admissible evidence.

admin (Super Admin): Has a hidden dashboard. Can approve/upgrade users from citizen to officer.

Admin Flow: A user submits a verification request. The Admin searches their wallet address on the dashboard and triggers a POST /api/admin/upgrade-officer request (protected by authorizeRoles('admin')). The DB role is changed to officer.

here admin will give aproval base on document provide by officer like begde , id card , aadhaar , goverment document and other importand document util update there status pendding 

6. DATA STORAGE MAPPING (What goes where?)

MongoDB (Database): User profiles, nonces, RBAC roles, unencrypted metadata (GPS, IMEI, case ID), full AI analysis details, IPFS CIDs, and Blockchain TxHashes (for fast UI rendering).

IPFS (Decentralized Storage): ONLY the AES-256 encrypted media file blob.

Blockchain (Smart Contract): ONLY immutable proof elements: evidenceId, fileHash (SHA-256 of raw file), ipfsCID, aiScore, timestamp, and uploaderWallet.

7. THE MASTER EVIDENCE PIPELINE (The Golden Path)

When an officer uploads evidence, this exact pipeline must execute:

Capture (Frontend): App extracts hardware metadata (Geo-tagging/GPS, Timestamp, Device Fingerprint/IMEI) along with the media file.

Hash & AI (Backend): Node.js generates a SHA-256 hash of the RAW file. Node.js sends the file to the AI API. (Use Mock Response: {score: 98.5, deepfake_detected: false}).

Encrypt & IPFS (Backend): File is encrypted (AES-256) and the blob is uploaded to Pinata IPFS. Pinata returns the ipfsCID.

Database (Backend): Save metadata to MongoDB (status='pending_blockchain').

Blockchain (Frontend + MetaMask): Node.js returns the [fileHash, ipfsCID, aiScore, evidenceId] to React. React uses ethers.js to prompt MetaMask. The Officer pays gas to execute the addEvidence() Smart Contract function.

Finalize: Once the transaction is mined, backend updates MongoDB status to stored_on_chain.

8. AI ASSISTANT INSTRUCTIONS 

When writing code for this project, you MUST:

Assume Malicious Actors: Validate all inputs. Protect all routes with protect and authorizeRoles middlewares.

MetaMask Context: Never write backend code that attempts to sign a blockchain transaction using a private key. ALL blockchain writes MUST be initiated by the React frontend prompting the user's MetaMask.

Implementation Phase: Focus on building clean, modular REST APIs for the Node.js backend first, ensuring the Web3 Login, Admin flows, and Evidence upload logic work flawlessly before moving to the React UI.