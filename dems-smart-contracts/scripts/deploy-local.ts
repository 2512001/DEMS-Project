import { ethers } from "hardhat";
import { exportToFrontend } from "./export-frontend";

/**
 * Deploy to a local Hardhat node (npx hardhat node).
 * Grants OFFICER_ROLE to the second default Hardhat account for immediate testing.
 */
async function main() {
  const [admin, officer] = await ethers.getSigners();

  console.log("Local deploy — admin:", admin.address);
  console.log("Local deploy — sample officer:", officer.address);

  const EvidenceRegistry = await ethers.getContractFactory("EvidenceRegistry");
  const registry = await EvidenceRegistry.deploy(admin.address);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("EvidenceRegistry deployed to:", address);

  const grantTx = await registry.connect(admin).grantOfficer(officer.address);
  await grantTx.wait();
  console.log("Granted OFFICER_ROLE to:", officer.address);

  const exported = await exportToFrontend(await import("hardhat").then((m) => m.default), address);

  console.log("\nLocal setup complete.");
  console.log("Chain ID:", exported.chainId);
  console.log("Contract:", address);
  console.log("\nUpdate dems-frontend-web/.env:");
  console.log(`VITE_EVIDENCE_CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_CHAIN_ID=${exported.chainId}`);
  console.log(`VITE_REQUIRED_CHAIN_ID=${exported.chainId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
