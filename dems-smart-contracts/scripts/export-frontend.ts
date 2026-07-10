import fs from "fs";
import path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const FRONTEND_CONTRACT_PATH = path.resolve(
  __dirname,
  "../../dems-frontend-web/src/contracts/EvidenceRegistry.json"
);

const FRONTEND_ABI_PATH = path.resolve(
  __dirname,
  "../../dems-frontend-web/src/abis/EvidenceRegistryAbi.js"
);

export interface FrontendExport {
  contractName: string;
  address: string;
  chainId: number;
  network: string;
  abi: unknown[];
  deployedAt: string;
}

export async function exportToFrontend(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string
): Promise<FrontendExport> {
  const artifact = await hre.artifacts.readArtifact("EvidenceRegistry");
  const network = await hre.ethers.provider.getNetwork();

  const payload: FrontendExport = {
    contractName: "EvidenceRegistry",
    address: contractAddress,
    chainId: Number(network.chainId),
    network: hre.network.name,
    abi: artifact.abi,
    deployedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(FRONTEND_CONTRACT_PATH), { recursive: true });
  fs.writeFileSync(FRONTEND_CONTRACT_PATH, JSON.stringify(payload, null, 2));

  const abiExport = `export const evidenceRegistryAbi = ${JSON.stringify(artifact.abi, null, 2)};\n\nexport const evidenceRegistryAddress = "${contractAddress}";\nexport const evidenceRegistryChainId = ${Number(network.chainId)};\n`;
  fs.mkdirSync(path.dirname(FRONTEND_ABI_PATH), { recursive: true });
  fs.writeFileSync(FRONTEND_ABI_PATH, abiExport);

  console.log(`Exported ABI + address to ${FRONTEND_CONTRACT_PATH}`);
  return payload;
}
