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
        enum: ['citizen', 'officer', 'admin', 'super_admin'],
        default: 'citizen',
        index: true
    },
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        default: null,
        index: true
    },
    accountStatus: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active'
    },
    nonce: {
        type: String,
        required: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },
    profile: {
        displayName: { type: String, default: '' },
        email: { type: String, default: '' },
        phone: { type: String, default: '' },
        department: { type: String, default: '' },
        designation: { type: String, default: '' },
        employeeId: { type: String, default: '' }
    },
    // Employee membership status
    membershipStatus: {
        type: String,
        enum: ['none', 'pending_approval', 'active', 'suspended', 'rejected'],
        default: 'none',
        index: true
    },
    membershipReviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    membershipReviewedAt: {
        type: Date,
        default: null
    },
    membershipRejectionReason: {
        type: String,
        default: ''
    },
    // Legacy officer verification for backward compatibility
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
        rejectionReason: { type: String, default: '' },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        reviewedAt: { type: Date, default: null },
        requestedAt: { type: Date, default: null },
        requestedOrganizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
