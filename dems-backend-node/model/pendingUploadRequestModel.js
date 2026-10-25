const mongoose = require('mongoose');
const { Schema } = mongoose;

const pendingUploadRequestSchema = new Schema({
    // Core identifiers
    evidenceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    caseId: {
        type: String,
        default: null,
        index: true
    },
    
    // Uploader information
    uploaderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    uploaderWallet: {
        type: String,
        required: true,
        lowercase: true
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    
    // File information
    fileName: {
        type: String,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    fileHash: {
        type: String,
        required: true,
        index: true
    },
    
    // Capture metadata
    captureMetadata: {
        deviceInfo: { type: String, required: true },
        gpsLocation: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        capturedAt: { type: Date, required: true }
    },
    
    // Storage reference (quarantine)
    quarantineStorageReference: {
        type: String,
        required: true
    },
    
    // Workflow status
    workflowStatus: {
        type: String,
        enum: ['pending_user_signature', 'pending_org_admin_approval', 'pending_super_admin_approval', 'pending_system_finalization', 'approved', 'rejected', 'finalized'],
        default: 'pending_user_signature',
        index: true
    },
    
    // User signature (uploader authorization)
    userSignature: {
        signature: { type: String, default: null },
        signedAt: { type: Date, default: null },
        messageHash: { type: String, default: null },
        walletAddress: { type: String, default: null } // For KEK derivation
    },
    
    // Organization Admin approval
    orgAdminApproval: {
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        signature: { type: String, default: null },
        signedAt: { type: Date, default: null },
        messageHash: { type: String, default: null },
        reason: { type: String, default: null },
        walletAddress: { type: String, default: null } // For KEK derivation
    },
    
    // Super Admin approval
    superAdminApproval: {
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        signature: { type: String, default: null },
        signedAt: { type: Date, default: null },
        messageHash: { type: String, default: null },
        reason: { type: String, default: null },
        walletAddress: { type: String, default: null } // For KEK derivation
    },
    
    // System finalization
    systemFinalization: {
        finalizedAt: { type: Date, default: null },
        evidenceId: { type: Schema.Types.ObjectId, ref: 'Evidence', default: null },
        ipfsCID: { type: String, default: null },
        blockchainTxHash: { type: String, default: null },
        error: { type: String, default: null }
    },
    
    // Rejection information
    rejection: {
        rejectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        rejectedAt: { type: Date, default: null },
        reason: { type: String, default: null },
        stage: { type: String, default: null }
    },
    
    // Request version for signature replay protection
    requestVersion: {
        type: Number,
        default: 1
    },
    
    // Nonce for signature freshness
    signatureNonce: {
        type: String,
        required: true,
        default: () => require('crypto').randomBytes(16).toString('hex')
    },
    
    // Expiry for approval window
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    
    // Optional AI analysis
    aiAnalysis: { type: Schema.Types.Mixed, default: null },
    
    // Blockchain requested flag
    blockchainRequested: {
        type: Boolean,
        default: false
    },
    
    // Multi-party key management (Phase 2)
    keyVersion: {
        type: String,
        default: null
    },
    encryptedDEKs: {
        user: {
            encryptedDEK: { type: Buffer, default: null },
            iv: { type: String, default: null },
            authTag: { type: String, default: null },
            algorithm: { type: String, default: 'aes-256-gcm' }
        },
        org_admin: {
            encryptedDEK: { type: Buffer, default: null },
            iv: { type: String, default: null },
            authTag: { type: String, default: null },
            algorithm: { type: String, default: 'aes-256-gcm' }
        },
        super_admin: {
            encryptedDEK: { type: Buffer, default: null },
            iv: { type: String, default: null },
            authTag: { type: String, default: null },
            algorithm: { type: String, default: 'aes-256-gcm' }
        }
    }
}, { 
    timestamps: true,
    indexes: [
        { workflowStatus: 1, createdAt: -1 },
        { organizationId: 1, workflowStatus: 1 },
        { uploaderId: 1, workflowStatus: 1 }
    ]
});

module.exports = mongoose.model('PendingUploadRequest', pendingUploadRequestSchema);
