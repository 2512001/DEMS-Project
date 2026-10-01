const mongoose = require('mongoose');
const { Schema } = mongoose;
const crypto = require('crypto');

const invitationSchema = new Schema({
    organizationId: {
        type: Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        index: true
    },
    invitedEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    invitedName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120
    },
    invitationType: {
        type: String,
        enum: ['organization_admin', 'employee'],
        required: true,
        index: true
    },
    invitedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: () => crypto.randomBytes(32).toString('hex')
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'revoked'],
        default: 'pending',
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    acceptedAt: {
        type: Date,
        default: null
    },
    acceptedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    acceptedWalletAddress: {
        type: String,
        trim: true,
        lowercase: true,
        default: null
    },
    // Email delivery tracking
    emailStatus: {
        type: String,
        enum: ['not_configured', 'sent', 'failed'],
        default: 'not_configured'
    },
    emailSentAt: {
        type: Date,
        default: null
    },
    emailMessageId: {
        type: String,
        default: null
    },
    emailError: {
        type: String,
        default: null
    },
    // Employee-specific fields
    department: {
        type: String,
        trim: true,
        maxlength: 100
    },
    designation: {
        type: String,
        trim: true,
        maxlength: 100
    },
    employeeId: {
        type: String,
        trim: true,
        maxlength: 50
    },
    contactPhone: {
        type: String,
        trim: true,
        maxlength: 20
    }
}, { timestamps: true });

invitationSchema.pre('validate', async function () {
    if (!this.token) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
});

// Index for cleanup of expired invitations
invitationSchema.index({ expiresAt: 1, status: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);