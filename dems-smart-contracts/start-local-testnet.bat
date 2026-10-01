@echo off
echo =========================================
echo DEMS Local Blockchain Testnet Setup
echo =========================================
echo.

echo 1. Checking if Hardhat node is running...
curl -s http://127.0.0.1:8545 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Hardhat node is already running on port 8545
) else (
    echo ❌ Hardhat node is not running
    echo    Starting Hardhat node...
    start cmd /k "npx hardhat node"
    echo    Waiting for Hardhat to start...
    timeout /t 5 /nobreak >nul
)

echo.
echo 2. Deploying EvidenceRegistry contract...
npx hardhat run scripts/deploy-local.ts --network localhost

echo.
echo =========================================
echo Setup Complete!
echo =========================================
echo.
echo Next Steps:
echo 1. Import this account in MetaMask:
echo    Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
echo    Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
echo.
echo 2. Add Hardhat Local network to MetaMask:
echo    Network Name: Hardhat Local
echo    RPC URL: http://127.0.0.1:8545
echo    Chain ID: 31337
echo    Currency Symbol: ETH
echo.
echo 3. Switch to Hardhat Local network in MetaMask
echo 4. Login to DEMS with the imported account
echo 5. Upload evidence with blockchain verification enabled
echo.
echo Contract Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
echo Chain ID: 31337
echo.
pause