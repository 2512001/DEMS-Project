const mongoose = require('mongoose');
const { Schema } = mongoose;

const modificationRequestSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    evidenceId: {
        type: Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true,
        index: true
    },
    requestedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changeReason: {
        type: String,
        required: true,
        maxlength: 1000
    },
    proposedCaseId: { type: String, default: null },
    newEvidenceId: {
        type: Schema.Types.ObjectId,
        ref: 'Evidence',
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    adminDecisionReason: { type: String, default: '' },
    resultingEvidenceId: { type: Schema.Types.ObjectId, ref: 'Evidence', default: null }
}, { timestamps: true });

module.exports = mongoose.model('ModificationRequest', modificationRequestSchema);
