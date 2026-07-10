import { ethers } from "hardhat";
import { exportToFrontend } from "./export-frontend";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying EvidenceRegistry with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const EvidenceRegistry = await ethers.getContractFactory("EvidenceRegistry");
  const registry = await EvidenceRegistry.deploy(deployer.address);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("EvidenceRegistry deployed to:", address);

  const exported = await exportToFrontend(await import("hardhat").then((m) => m.default), address);

  console.log("\nDeployment summary:");
  console.log(JSON.stringify({ address, chainId: exported.chainId, network: exported.network }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
