const mongoose = require('mongoose');
const { Schema } = mongoose;

const evidenceSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true

    },
    UploaderWallet: {
        type: String,
        required: true,
        lowercase: true,
        index: true

    },
    caseId: {
        type: String,
        default: null // Optional: Law enforcement can group evidence by Case Number
    },
     // 3. SECURE HARDWARE METADATA (What you just suggested!)
    captureMetadata: {
        deviceInfo: { type: String, required: true }, // e.g., "iPhone 14 Pro - IMEI: 8472910"
        gpsLocation: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        capturedAt: { type: Date, required: true } // The exact hardware time the photo was taken
    },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true }, // e.g., 'image/jpeg', 'video/mp4'
    fileSize: { type: Number, required: true },
    fileHash: {
        type: String,
        required: true,
        unique: true // SHA-256 hash of the raw file. Prevents duplicate uploads.
    },
    encryptionMethod: {
        type: String,
        default: 'AES-256' // Documents how it was secured before IPFS
    },
    ipfsCID: {
        type: String,
        default: null // The hash returned by Pinata/IPFS (Where the file actually lives)
    },
    encryption: {
        iv: { type: String, default: null },
        authTag: { type: String, default: null },
        algorithm: { type: String, default: 'aes-256-gcm' }
    },
    blockchainTxHash: {
        type: String,
        default: null // The transaction ID on Polygon proving this was logged immutably
    },
    // 5. AI Verification Results
    aiAnalysis: {
        score: { type: Number, default: 0 },         // e.g., 98.5% genuine
        isDeepfake: { type: Boolean, default: false },
        metadataMatch: { type: Boolean, default: true } // Did GPS EXIF data match?
    },

    // 6. Pipeline Status
    status: {
        type: String,
        enum: ['processing', 'encrypted', 'pending_blockchain', 'stored_on_chain', 'flagged_by_ai', 'error'],
        default: 'processing'
    },
    statusMessage: {
        type: String,
        default: 'Initializing secure upload...' // Granular, user-friendly message for the live UI
    }

}, { timestamps: true });
module.exports = mongoose.model("Evidence", evidenceSchema);
