const { ethers } = require('ethers');
const crypto = require('crypto');

/**
 * Build canonical message for signature
 * Includes all critical fields to prevent request substitution
 */
function buildUploadRequestMessage(pendingRequest) {
    const fields = [
        'evidenceId',
        'caseId',
        'uploaderWallet',
        'fileHash',
        'workflowStatus',
        'requestVersion',
        'signatureNonce',
        'action'
    ];
    
    const canonical = fields
        .map(field => {
            const value = pendingRequest[field] || '';
            return `${field}:${value}`;
        })
        .join('|');
    
    return `DEMS Upload Authorization\n${canonical}`;
}

/**
 * Compute SHA-256 hash of the message
 */
function computeMessageHash(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
}

/**
 * Verify Ethereum signature
 * @param {string} message - The original message that was signed
 * @param {string} signature - The signature (0x prefixed)
 * @param {string} expectedAddress - The expected signer address
 * @returns {boolean} true if signature is valid
 */
function verifyEthereumSignature(message, signature, expectedAddress) {
    try {
        if (!signature || !signature.startsWith('0x')) {
            return false;
        }
        
        const recoveredAddress = ethers.verifyMessage(message, signature).toLowerCase();
        return recoveredAddress === expectedAddress.toLowerCase();
    } catch (error) {
        console.error('[SIGNATURE] Verification failed:', error.message);
        return false;
    }
}

/**
 * Validate signature nonce and expiry
 * @param {Object} pendingRequest - The pending upload request
 * @returns {Object} { valid: boolean, reason?: string }
 */
function validateSignatureNonce(pendingRequest) {
    if (!pendingRequest.signatureNonce) {
        return { valid: false, reason: 'Signature nonce is missing' };
    }
    
    if (pendingRequest.expiresAt && new Date() > pendingRequest.expiresAt) {
        return { valid: false, reason: 'Request has expired' };
    }
    
    return { valid: true };
}

/**
 * Verify upload authorization signature
 * @param {Object} pendingRequest - The pending upload request
 * @param {string} signature - The signature to verify
 * @param {string} signerAddress - The expected signer address
 * @param {string} action - The action being authorized (e.g., 'upload', 'approve', 'finalize')
 * @returns {Object} { valid: boolean, reason?: string, messageHash?: string }
 */
function verifyUploadSignature(pendingRequest, signature, signerAddress, action = 'upload') {
    // Validate nonce and expiry
    const nonceValidation = validateSignatureNonce(pendingRequest);
    if (!nonceValidation.valid) {
        return nonceValidation;
    }
    
    // Build canonical message with action
    const messageData = { ...pendingRequest.toObject(), action };
    const message = buildUploadRequestMessage(messageData);
    const messageHash = computeMessageHash(message);
    
    // Verify signature
    const isValid = verifyEthereumSignature(message, signature, signerAddress);
    
    if (!isValid) {
        return { valid: false, reason: 'Signature verification failed' };
    }
    
    // Check for replay - if the same signature was already used
    if (pendingRequest.userSignature?.signature === signature && action === 'upload') {
        return { valid: false, reason: 'Signature replay detected' };
    }
    
    return { valid: true, messageHash };
}

/**
 * Generate a nonce for a new upload request
 * @returns {string} 32-byte hex nonce
 */
function generateNonce() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Create expiry date for approval window
 * @param {number} days - Number of days until expiry (default: 7)
 * @returns {Date} Expiry date
 */
function createExpiryDate(days = 7) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
    buildUploadRequestMessage,
    computeMessageHash,
    verifyEthereumSignature,
    validateSignatureNonce,
    verifyUploadSignature,
    generateNonce,
    createExpiryDate
};
