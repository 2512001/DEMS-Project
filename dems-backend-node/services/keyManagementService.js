const crypto = require('crypto');

/**
 * Key Management Service
 * Implements envelope encryption with key hierarchy for multi-party authorization
 */

// Role constants
const ROLES = {
    USER: 'user',
    ORG_ADMIN: 'org_admin',
    SUPER_ADMIN: 'super_admin'
};

/**
 * Get role-specific secret from environment
 */
function getRoleSecret(role) {
    switch (role) {
        case ROLES.USER:
            return process.env.USER_KEY_SECRET;
        case ROLES.ORG_ADMIN:
            return process.env.ORG_ADMIN_KEY_SECRET;
        case ROLES.SUPER_ADMIN:
            return process.env.SUPER_ADMIN_KEY_SECRET;
        default:
            throw new Error(`Unknown role: ${role}`);
    }
}

/**
 * Validate role secret configuration
 */
function validateRoleSecrets() {
    const secrets = {
        [ROLES.USER]: getRoleSecret(ROLES.USER),
        [ROLES.ORG_ADMIN]: getRoleSecret(ROLES.ORG_ADMIN),
        [ROLES.SUPER_ADMIN]: getRoleSecret(ROLES.SUPER_ADMIN)
    };

    for (const [role, secret] of Object.entries(secrets)) {
        if (!secret) {
            console.warn(`[KEY MANAGEMENT] ${role.toUpperCase()}_KEY_SECRET not configured. Key management will fail.`);
            return false;
        }
        const key = Buffer.from(secret, 'hex');
        if (key.length !== 32) {
            console.error(`[KEY MANAGEMENT] ${role.toUpperCase()}_KEY_SECRET must be 32-byte hex.`);
            return false;
        }
    }

    return true;
}

/**
 * Generate a cryptographically secure random Data Encryption Key (DEK)
 * @returns {Buffer} 32-byte random key for AES-256-GCM
 */
function generateDEK() {
    return crypto.randomBytes(32);
}

/**
 * Derive Key Encryption Key (KEK) from wallet signature and role secret
 * Uses PBKDF2 with 100,000 iterations for key derivation
 * 
 * @param {string} walletSignature - Ethereum signature from wallet
 * @param {string} role - Role identifier (user, org_admin, super_admin)
 * @returns {Buffer} 32-byte derived KEK
 */
function deriveKEK(walletSignature, role) {
    const secret = getRoleSecret(role);
    
    if (!secret) {
        throw new Error(`Role secret not configured for ${role}. Cannot derive KEK.`);
    }

    // Use wallet signature as password, role secret as salt
    const password = Buffer.from(walletSignature, 'hex');
    const salt = Buffer.from(secret, 'hex');

    // PBKDF2 with 100,000 iterations (OWASP recommendation)
    const key = crypto.pbkdf2Sync(
        password,
        salt,
        100000,
        32, // 256 bits for AES-256
        'sha256'
    );

    return key;
}

/**
 * Encrypt a DEK with a KEK (envelope encryption)
 * 
 * @param {Buffer} dek - Data Encryption Key to encrypt
 * @param {Buffer} kek - Key Encryption Key
 * @returns {Object} { encryptedDEK: Buffer, iv: string, authTag: string }
 */
function encryptDEK(dek, kek) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    
    const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedDEK: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
    };
}

/**
 * Decrypt a DEK with a KEK
 * 
 * @param {Buffer} encryptedDEK - Encrypted DEK
 * @param {string} iv - Initialization vector
 * @param {string} authTag - Authentication tag
 * @param {Buffer} kek - Key Encryption Key
 * @returns {Buffer} Decrypted DEK
 */
function decryptDEK(encryptedDEK, iv, authTag, kek) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    return Buffer.concat([
        decipher.update(encryptedDEK),
        decipher.final()
    ]);
}

/**
 * Create encrypted DEK envelopes for all three roles
 * 
 * @param {Buffer} dek - Data Encryption Key
 * @param {Object} signatures - Wallet signatures for each role
 * @returns {Object} { user: envelope, org_admin: envelope, super_admin: envelope }
 */
function createDEKEnvelopes(dek, signatures) {
    const envelopes = {};

    for (const role of Object.values(ROLES)) {
        if (!signatures[role]) {
            console.warn(`[KEY MANAGEMENT] No signature provided for ${role}, skipping envelope creation`);
            continue;
        }

        try {
            const kek = deriveKEK(signatures[role], role);
            const envelope = encryptDEK(dek, kek);
            envelopes[role] = envelope;
        } catch (error) {
            console.error(`[KEY MANAGEMENT] Failed to create envelope for ${role}:`, error.message);
            throw error;
        }
    }

    return envelopes;
}

/**
 * Decrypt DEK from an envelope using wallet signature
 * 
 * @param {Object} envelope - Encrypted DEK envelope
 * @param {string} walletSignature - Wallet signature for KEK derivation
 * @param {string} role - Role identifier
 * @returns {Buffer} Decrypted DEK
 */
function decryptDEKFromEnvelope(envelope, walletSignature, role) {
    const kek = deriveKEK(walletSignature, role);
    return decryptDEK(
        envelope.encryptedDEK,
        envelope.iv,
        envelope.authTag,
        kek
    );
}

/**
 * Encrypt data using a DEK (per-file encryption)
 * 
 * @param {Buffer} data - Data to encrypt
 * @param {Buffer} dek - Data Encryption Key
 * @returns {Object} { encryptedData: Buffer, iv: string, authTag: string }
 */
function encryptWithDEK(data, dek) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
    };
}

/**
 * Decrypt data using a DEK
 * 
 * @param {Buffer} encryptedData - Encrypted data
 * @param {string} iv - Initialization vector
 * @param {string} authTag - Authentication tag
 * @param {Buffer} dek - Data Encryption Key
 * @returns {Buffer} Decrypted data
 */
function decryptWithDEK(encryptedData, iv, authTag, dek) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', dek, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]);
}

/**
 * Generate key version identifier
 * @returns {string} Version string (e.g., "v1", "v2")
 */
function generateKeyVersion() {
    return `v${Date.now()}`;
}

module.exports = {
    ROLES,
    validateRoleSecrets,
    generateDEK,
    deriveKEK,
    encryptDEK,
    decryptDEK,
    createDEKEnvelopes,
    decryptDEKFromEnvelope,
    encryptWithDEK,
    decryptWithDEK,
    generateKeyVersion
};
