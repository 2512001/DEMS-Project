const AuditLog = require('../model/auditLogModel');

async function writeAuditLog({
    actor,
    organizationId = null,
    action,
    targetType = '',
    targetId = '',
    result = 'success',
    reason = '',
    metadata = {}
}) {
    try {
        await AuditLog.create({
            actorId: actor?.id || null,
            actorWallet: actor?.walletAddress || '',
            organizationId: organizationId || actor?.organizationId || null,
            action,
            targetType,
            targetId: targetId ? String(targetId) : '',
            result,
            reason,
            metadata
        });
    } catch (err) {
        console.error('[AUDIT] Failed to write audit log:', err.message);
    }
}

module.exports = {
    writeAuditLog
};
