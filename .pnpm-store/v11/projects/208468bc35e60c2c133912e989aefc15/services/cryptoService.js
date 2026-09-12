const crypto = require('crypto');

function getEncryptionKey() {
    const configuredKey = process.env.EVIDENCE_AES_KEY;

    if (configuredKey) {
        const key = Buffer.from(configuredKey, 'hex');
        if (key.length !== 32) {
            throw new Error('EVIDENCE_AES_KEY must be a 32-byte hex encoded key.');
        }
        return key;
    }

    console.warn('[SECURITY] EVIDENCE_AES_KEY is not configured. Using JWT_SECRET-derived development key.');
    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dems-development-key').digest();
}

function encryptBuffer(buffer) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedBuffer: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
    };
}

function decryptFile(encryptedBuffer, encryptionObj) {
    const decipher = crypto.createDecipheriv(
        encryptionObj.algorithm,
        getEncryptionKey(),
        Buffer.from(encryptionObj.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptionObj.authTag, 'hex'));

    return Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
    ]);
}

function computeSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
    getEncryptionKey,
    encryptBuffer,
    decryptFile,
    computeSha256
};
