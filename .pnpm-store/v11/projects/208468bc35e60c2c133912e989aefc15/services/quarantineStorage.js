const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const QUARANTINE_DIR = path.join(__dirname, '..', 'quarantine-store');

function ensureQuarantineDir() {
    if (!fs.existsSync(QUARANTINE_DIR)) {
        fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
    }
}

function storeQuarantineFile(buffer, originalName) {
    ensureQuarantineDir();
    const safeName = String(originalName || 'evidence').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeName}`;
    const absolutePath = path.join(QUARANTINE_DIR, fileName);
    fs.writeFileSync(absolutePath, buffer);
    return fileName;
}

function readQuarantineFile(reference) {
    const fileName = path.basename(String(reference || ''));
    const absolutePath = path.join(QUARANTINE_DIR, fileName);
    if (!fs.existsSync(absolutePath)) {
        const error = new Error('Quarantine file is no longer available.');
        error.statusCode = 404;
        throw error;
    }
    return fs.readFileSync(absolutePath);
}

module.exports = {
    storeQuarantineFile,
    readQuarantineFile
};
