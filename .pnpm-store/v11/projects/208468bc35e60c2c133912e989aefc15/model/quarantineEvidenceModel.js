const mongoose = require('mongoose');
const { Schema } = mongoose;

const quarantineEvidenceSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    uploaderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    UploaderWallet: {
        type: String,
        required: true,
        lowercase: true
    },
    caseId: { type: String, default: null },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    originalFileHash: { type: String, required: true, index: true },
    captureMetadata: {
        deviceInfo: { type: String, required: true },
        gpsLocation: {
            latitude: { type: Number, required: true },
            longitude: { type: Number, required: true }
        },
        capturedAt: { type: Date, required: true }
    },
    aiAnalysis: { type: Schema.Types.Mixed, default: {} },
    temporaryStorageReference: { type: String, required: true },
    blockchainRequested: { type: Boolean, default: false },
    reviewStatus: {
        type: String,
        enum: ['pending_review', 'approved', 'rejected'],
        default: 'pending_review',
        index: true
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    adminDecisionReason: { type: String, default: '' },
    resultingEvidenceId: { type: Schema.Types.ObjectId, ref: 'Evidence', default: null }
}, { timestamps: true });

module.exports = mongoose.model('QuarantineEvidence', quarantineEvidenceSchema);
