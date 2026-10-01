const crypto = require('crypto');
const { PinataSDK } = require('pinata');
const { Blob, File } = require('buffer');

const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.GATEWAY_URL
});

async function uploadEncryptedBlobToPinata(encryptedBuffer, originalName) {
    if (!process.env.PINATA_JWT) {
        const mockCID = `mock-${crypto.createHash('sha256').update(encryptedBuffer).digest('hex').slice(0, 46)}`;
        console.warn(`[IPFS] PINATA_JWT not configured. Returning development CID=${mockCID}`);
        return mockCID;
    }

    try {
        const blob = new Blob([encryptedBuffer]);
        const file = new File([blob], originalName, {
            type: 'application/octet-stream'
        });
        const upload = await pinata.upload.public.file(file);
        if (!upload?.cid) {
            throw new Error('Pinata did not return a CID.');
        }
        return upload.cid;
    } catch (err) {
        if (err.statusCode) throw err;
        console.error('[IPFS] Pinata upload failed:', err.message);
        const error = new Error('Failed to store encrypted evidence on IPFS. Check PINATA_JWT, gateway URL, and network.');
        error.statusCode = 502;
        throw error;
    }
}

async function fetchEncryptedBlobFromIpfs(ipfsCID) {
    if (String(ipfsCID).startsWith('mock-')) {
        const error = new Error('IPFS content is unavailable for development mock CIDs.');
        error.statusCode = 422;
        throw error;
    }

    const response = await pinata.gateways.public.get(ipfsCID);
    const encryptedBlob = response.data;

    if (Buffer.isBuffer(encryptedBlob)) {
        return encryptedBlob;
    }

    if (typeof encryptedBlob === 'string') {
        return Buffer.from(encryptedBlob);
    }

    if (encryptedBlob?.arrayBuffer) {
        return Buffer.from(await encryptedBlob.arrayBuffer());
    }

    const error = new Error('Unable to read encrypted evidence blob from IPFS.');
    error.statusCode = 502;
    throw error;
}

module.exports = {
    uploadEncryptedBlobToPinata,
    fetchEncryptedBlobFromIpfs
};
