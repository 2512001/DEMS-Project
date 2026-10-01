# DEMS Debugging Guide - Email & Blockchain Issues

## 🔧 Email Issue - Gmail Authentication Failed

### Current Status
- ❌ Gmail rejecting login with current password
- ✅ Email service code is correct
- ❌ Need Gmail App Password for authentication

### Fix Steps

#### 1. Enable 2-Factor Authentication (Required)
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification"
3. Complete the setup process

#### 2. Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" as the app
3. Select "Other (Custom name)" and enter "DEMS"
4. Click "Generate"
5. Copy the 16-character App Password (e.g., `abcd efgh ijkl mnop`)

#### 3. Update .env File
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dipakgiree41@gmail.com
SMTP_PASSWORD=your-app-password-here  # Remove spaces!
EMAIL_FROM=DEMS <dipakgiree41@gmail.com>
```

**Important**: Remove spaces from the App Password
- If App Password is: `abcd efgh ijkl mnop`
- In .env use: `abcdefghijklmnop`

#### 4. Test Email Configuration
```bash
cd dems-backend-node
node scripts/test-email.js
```

#### 5. Restart Backend
```bash
cd dems-backend-node
npm run dev
```

---

## 🔗 MetaMask Transaction Issues

### Current Status
- ✅ Evidence upload flow is correct
- ✅ IPFS storage is working
- ✅ AI verification is working
- ❌ Blockchain transactions failing

### Common Issues & Solutions

#### Issue 1: Wrong Network
**Error**: `No contract code at VITE_EVIDENCE_CONTRACT_ADDRESS`
**Solution**: Ensure MetaMask is on localhost network (Chain ID: 31337)

#### Issue 2: Insufficient ETH
**Error**: `This MetaMask account has 0 ETH`
**Solution**: Import Hardhat account with test ETH
```javascript
// In MetaMask: Settings → Import Account
// Enter this private key:
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

#### Issue 3: Contract Not Deployed
**Error**: `No EvidenceRegistry contract at this address`
**Solution**: Deploy the smart contract
```bash
cd dems-smart-contracts
npx hardhat run scripts/deploy-local.ts --network localhost
```

#### Issue 4: Wallet Mismatch
**Error**: `MetaMask account does not match the uploader`
**Solution**: Use the same wallet address for both login and blockchain transactions

#### Issue 5: Hardhat Node Not Running
**Error**: `Network error` or `RPC endpoint error`
**Solution**: Start Hardhat node
```bash
cd dems-smart-contracts
npx hardhat node
```

### Blockchain Configuration Check

#### Frontend Environment
```env
VITE_EVIDENCE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
VITE_CHAIN_ID=31337
VITE_REQUIRED_CHAIN_ID=31337
```

#### Backend Environment
```env
EVIDENCE_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
RPC_URL=http://127.0.0.1:8545
```

### Testing Blockchain Transactions

#### 1. Start Hardhat Node
```bash
cd dems-smart-contracts
npx hardhat node
```

#### 2. Deploy Contract (if not already deployed)
```bash
cd dems-smart-contracts
npx hardhat run scripts/deploy-local.ts --network localhost
```

#### 3. Import Test Account in MetaMask
- Account 1: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- This account has 10,000 ETH for testing

#### 4. Switch to Localhost Network in MetaMask
- Network Name: Hardhat Local
- RPC URL: http://127.0.0.1:8545
- Chain ID: 31337
- Currency Symbol: ETH

#### 5. Test Evidence Upload
1. Login with the imported account
2. Upload evidence with blockchain verification enabled
3. Confirm MetaMask transaction
4. Check for transaction success

### Debugging Blockchain Transactions

#### Check Contract Deployment
```bash
cd dems-smart-contracts
npx hardhat console --network localhost
```

Then in console:
```javascript
const address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const code = await ethers.provider.getCode(address);
console.log("Contract deployed:", code !== "0x");
```

#### Check Account Balance
```javascript
const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const balance = await ethers.provider.getBalance(address);
console.log("Balance:", ethers.formatEther(balance), "ETH");
```

#### Test Contract Call
```javascript
const abi = [...]; // Your contract ABI
const contract = new ethers.Contract(address, abi, (await ethers.getSigners())[0]);
const exists = await contract.evidenceExists("test-id");
console.log("Evidence exists:", exists);
```

---

## 📋 Complete Testing Checklist

### Email Testing
- [ ] Enable 2FA on Google account
- [ ] Generate App Password
- [ ] Update .env with App Password
- [ ] Run test-email.js script
- [ ] Verify test email received
- [ ] Test invitation email sending
- [ ] Verify invitation email received

### Blockchain Testing
- [ ] Start Hardhat node
- [ ] Deploy EvidenceRegistry contract
- [ ] Update frontend contract address
- [ ] Import test account in MetaMask
- [ ] Switch to localhost network
- [ ] Login with test account
- [ ] Upload evidence with blockchain verification
- [ ] Confirm MetaMask transaction
- [ ] Verify transaction succeeded
- [ ] Check evidence record shows blockchain proof

---

## 🚨 Common Error Messages & Solutions

### Email Errors
- `Invalid login: 535-5.7.8` → Need App Password
- `Connection refused` → Backend not running
- `Timed out` → Network/firewall issue

### Blockchain Errors
- `No contract code` → Contract not deployed or wrong network
- `Insufficient funds` → Need test ETH from Hardhat
- `Uploader mismatch` → Wrong wallet address
- `User rejected` → User cancelled MetaMask transaction
- `RPC error` → Hardhat node not running

---

## 📞 Next Steps

1. **Fix Email First**: Configure Gmail App Password
2. **Test Email**: Run test-email.js to verify
3. **Start Blockchain**: Start Hardhat node
4. **Deploy Contract**: Ensure EvidenceRegistry is deployed
5. **Import Account**: Add test account to MetaMask
6. **Test Upload**: Upload evidence with blockchain verification
7. **Verify Success**: Check both email and blockchain work

Both issues require configuration changes, not code fixes. The code is correct - the issue is proper configuration of external services (Gmail SMTP and Hardhat blockchain).