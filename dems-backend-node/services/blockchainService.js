const { ethers } = require('ethers');
const { evidenceRegistryAbi } = require('../abis/EvidenceRegistryAbi');

let cachedProvider = null;
let cachedContract = null;
let cachedAddress = '';
let cachedRpc = '';

function serviceError(code, message, statusCode = 503) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function getContractConfig() {
    const contractAddress = process.env.EVIDENCE_CONTRACT_ADDRESS;
    const rpcUrl = process.env.RPC_URL;

    if (!contractAddress) {
        throw serviceError('CONTRACT_NOT_CONFIGURED', 'EVIDENCE_CONTRACT_ADDRESS is not configured on the server.');
    }

    if (!ethers.isAddress(contractAddress)) {
        throw serviceError('CONTRACT_NOT_CONFIGURED', 'EVIDENCE_CONTRACT_ADDRESS is not a valid Ethereum address.');
    }

    if (!rpcUrl) {
        throw serviceError('RPC_NOT_CONFIGURED', 'RPC_URL is not configured on the server.');
    }

    return { contractAddress, rpcUrl };
}

function getProvider() {
    const { contractAddress, rpcUrl } = getContractConfig();

    if (!cachedProvider || cachedAddress !== contractAddress || cachedRpc !== rpcUrl) {
        cachedProvider = new ethers.JsonRpcProvider(rpcUrl);
        cachedContract = null;
        cachedAddress = contractAddress;
        cachedRpc = rpcUrl;
    }

    return cachedProvider;
}

function getEvidenceContract() {
    const { contractAddress } = getContractConfig();
    const provider = getProvider();

    if (!cachedContract) {
        cachedContract = new ethers.Contract(contractAddress, evidenceRegistryAbi, provider);
    }

    return cachedContract;
}

async function inspectDeployment() {
    const { contractAddress, rpcUrl } = getContractConfig();
    const provider = getProvider();

    let network;
    try {
        network = await provider.getNetwork();
    } catch (error) {
        throw serviceError(
            'RPC_UNAVAILABLE',
            `Cannot reach blockchain RPC at ${rpcUrl}. Start the local Hardhat node or update RPC_URL. ${error.message}`
        );
    }

    let code;
    try {
        code = await provider.getCode(contractAddress);
    } catch (error) {
        throw serviceError(
            'RPC_UNAVAILABLE',
            `Failed to read contract code from ${rpcUrl}: ${error.message}`
        );
    }

    return {
        contractAddress,
        rpcUrl,
        chainId: Number(network.chainId),
        hasCode: Boolean(code && code !== '0x')
    };
}

async function assertContractDeployed() {
    const deployment = await inspectDeployment();
    if (!deployment.hasCode) {
        throw serviceError(
            'CONTRACT_NOT_DEPLOYED',
            `No EvidenceRegistry bytecode at ${deployment.contractAddress} on chain ${deployment.chainId}. eth_call returns empty data (0x), which ethers reports as evidenceExists BAD_DATA. Deploy EvidenceRegistry to this network and set EVIDENCE_CONTRACT_ADDRESS.`
        );
    }
    return deployment;
}

function explainCallFailure(error, methodName) {
    const raw = `${error?.shortMessage || ''} ${error?.code || ''} ${error?.message || ''}`;
    const lower = raw.toLowerCase();

    if (error?.code === 'BAD_DATA' || lower.includes('could not decode') || lower.includes('value="0x"')) {
        return serviceError(
            'CONTRACT_CALL_FAILED',
            `${methodName} returned empty result data (0x). The RPC responded, but ${process.env.EVIDENCE_CONTRACT_ADDRESS} is not a matching EvidenceRegistry on this network. Check RPC_URL, chain ID, ABI, and contract address. Original: ${error.shortMessage || error.message}`
        );
    }

    return error;
}

async function evidenceExists(evidenceId) {
    await assertContractDeployed();
    const contract = getEvidenceContract();
    try {
        return Boolean(await contract.evidenceExists(String(evidenceId)));
    } catch (error) {
        throw explainCallFailure(error, 'evidenceExists(string)');
    }
}

function mapEvidenceResult(result) {
    return {
        evidenceId: result[0] ?? result.storedEvidenceId,
        fileHash: result[1] ?? result.fileHash,
        ipfsCID: result[2] ?? result.ipfsCID,
        aiScore: Number(result[3] ?? result.aiScore),
        uploadedAt: new Date(Number(result[4] ?? result.timestamp) * 1000).toISOString(),
        uploadedBy: String(result[5] ?? result.uploaderWallet).toLowerCase()
    };
}

async function getOnChainEvidence(evidenceId) {
    const exists = await evidenceExists(evidenceId);

    if (!exists) {
        const error = new Error('Evidence record not found on blockchain.');
        error.code = 'EVIDENCE_NOT_ON_CHAIN';
        error.statusCode = 422;
        throw error;
    }

    const contract = getEvidenceContract();
    try {
        const result = await contract.verifyEvidence(String(evidenceId));
        return mapEvidenceResult(result);
    } catch (error) {
        throw explainCallFailure(error, 'verifyEvidence(string)');
    }
}

module.exports = {
    inspectDeployment,
    assertContractDeployed,
    evidenceExists,
    getOnChainEvidence
};
