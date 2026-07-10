# DEMS Project Setup Guide

This project contains 3 main parts:
- Frontend: dems-frontend-web
- Backend: dems-backend-node
- Smart Contracts: dems-smart-contracts

Follow these steps carefully. If someone clones this project, they should be able to run everything successfully using this guide.

---

## 1. Required Software

Install these first:
- Node.js (v18 or above)
- npm
- Git
- MongoDB (local install or MongoDB Atlas)
- MetaMask browser extension
- A Pinata account for IPFS upload

Check versions:
```bash
node -v
npm -v
```

---

## 2. Clone the Project

```bash
git clone <your-repo-url>
cd "Evidence storage"
```

---

## 3. Install Dependencies

### Frontend
```bash
cd dems-frontend-web
npm install
```

### Backend
```bash
cd ../dems-backend-node
npm install
```

### Smart Contracts
```bash
cd ../dems-smart-contracts
npm install
```

---

## 4. Database Setup (MongoDB)

This project uses MongoDB to store evidence metadata.

### Option A: Local MongoDB
Start MongoDB locally.

Then make sure your DB is reachable at:
```bash
mongodb://127.0.0.1:27017/DEMS
```
---

## 5. Environment Variables (.env)
prsent there


```env option present in code dont need for now
PORT=3000
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=6d
EVIDENCE_AES_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
PINATA_JWT=your_pinata_jwt
GATEWAY_URL=your_pinata_gateway_url
```

### Frontend .env
Create file: dems-frontend-web/.env

```env dont need present there now if not then use 
VITE_API_BASE_URL=http://127.0.0.1:3000/api
VITE_EVIDENCE_CONTRACT_ADDRESS=your_deployed_contract_address
VITE_REQUIRED_CHAIN_ID=31337
```

### Smart Contracts .env
Create file: dems-smart-contracts/.env

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=your_wallet_private_key
```

> Never share your private key. Use a test wallet only.

---

## 6. Run Smart Contracts

### Compile contracts
```bash
cd ../dems-smart-contracts
npx hardhat compile
```

### Start local Hardhat node (optional but recommended for local testing)
Open a new terminal:
```bash
cd dems-smart-contracts
npx hardhat node
```

### Deploy contracts locally
In another terminal:
```bash
cd dems-smart-contracts
npx hardhat run scripts/deploy-local.ts --network localhost
```

After deployment, copy the printed contract address and paste it into:
```bash
dems-frontend-web/.env
```

Example:
```env
VITE_EVIDENCE_CONTRACT_ADDRESS=0xYourContractAddress
```

---

## 7. Run the Backend

```bash
cd ../dems-backend-node
npm run dev
```

Backend will run at:
```bash
http://127.0.0.1:3000
```

---

## 8. Run the Frontend

```bash
cd ../dems-frontend-web
npm run dev
```

Frontend will run at:
```bash
http://127.0.0.1:5173
```

---

## 9. Extra Things You Must Set Up

### MetaMask
Install MetaMask browser extension.

Add a local network:
- Network Name: Hardhat Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency Symbol: ETH

Also import a Hardhat account into MetaMask if needed.

### IPFS / Pinata
Create an account on Pinata.

Generate a JWT token and add it to backend .env:
```env
PINATA_JWT=your_pinata_jwt
GATEWAY_URL=your_pinata_gateway_url
```

This is required for evidence upload to IPFS.

### Wallet for Contract Deployment
Use a test wallet with some test ETH or test MATIC for deployment.

For local development, Hardhat local accounts are enough.

---

## 10. Optional Useful Commands (no need)

### Run smart contract tests
```bash
cd dems-smart-contracts
npx hardhat test
```

### Run backend smoke test
```bash
cd dems-backend-node
node scripts/smokeApiTest.js
```

---

## 11. Quick Start Summary

If you want the fastest way:

```bash
cd dems-smart-contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy-local.ts --network localhost

cd ../dems-backend-node
npm install
npm run dev

cd ../dems-frontend-web
npm install
npm run dev
```

---

## 12. Final Notes

- Make sure MongoDB is running.
- Make sure MetaMask is connected.
- Make sure Pinata credentials are added.
- Make sure the contract address is copied into frontend .env.
- Keep your .env files private and local.

If you want, I can also make this README more professional with screenshots, architecture flow, and a one-click setup script next.