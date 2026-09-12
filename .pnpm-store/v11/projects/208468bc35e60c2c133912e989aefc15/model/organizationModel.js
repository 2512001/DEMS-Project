const mongoose = require('mongoose');
const { Schema } = mongoose;

const organizationSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160
    },
    organizationCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    organizationType: {
        type: String,
        enum: ['law_enforcement', 'corporate', 'government', 'legal', 'healthcare', 'education', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    // Contact Information
    officialEmail: {
        type: String,
        trim: true,
        lowercase: true,
        maxlength: 120
    },
    officialPhone: {
        type: String,
        trim: true,
        maxlength: 20
    },
    website: {
        type: String,
        trim: true,
        maxlength: 200
    },
    address: {
        street: { type: String, trim: true, maxlength: 200 },
        city: { type: String, trim: true, maxlength: 100 },
        state: { type: String, trim: true, maxlength: 100 },
        country: { type: String, trim: true, maxlength: 100 },
        postalCode: { type: String, trim: true, maxlength: 20 }
    },
    // Primary Contact
    primaryContact: {
        name: { type: String, trim: true, maxlength: 120 },
        email: { type: String, trim: true, lowercase: true, maxlength: 120 },
        phone: { type: String, trim: true, maxlength: 20 },
        designation: { type: String, trim: true, maxlength: 100 }
    },
    // System fields
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Legacy field for backward compatibility
    adminId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'active',
        index: true
    },
    policy: {
        requireAIForEmployees: { type: Boolean, default: true },
        requireBlockchainForEmployees: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);