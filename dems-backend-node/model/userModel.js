const mongoose = require('mongoose');
const crypto = require('crypto');

const { Schema } = mongoose;

const userSchema = new Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    role: {
        type: String,
        enum: ['citizen', 'officer', 'admin'],
        default: 'citizen',
        index: true
    },
    nonce: {
        type: String,
        required: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },
    profile: {
        displayName: { type: String, default: '' },
        email: { type: String, default: '' }
    },
    officerVerification: {
        status: {
            type: String,
            enum: ['none', 'pending', 'approved', 'rejected'],
            default: 'none',
            index: true
        },
        badgeNumber: { type: String, default: '' },
        governmentIdNumber: { type: String, default: '' },
        aadhaarNumber: { type: String, default: '' },
        documents: [{
            fieldName: String,
            originalName: String,
            path: String,
            mimeType: String,
            size: Number,
            uploadedAt: { type: Date, default: Date.now }
        }],
        rejectionReason: { type: String, default: 'pending' },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        requestedAt: { type: Date, default: null }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
