const mongoose = require('mongoose');
const { Schema } = mongoose;

const auditLogSchema = new Schema({
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorWallet: { type: String, default: '', lowercase: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: '' },
    targetId: { type: String, default: '' },
    result: { type: String, default: 'success' },
    reason: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
