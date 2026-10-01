const zlib = require('zlib');

// Supported file extensions for compression
const COMPRESSIBLE_EXTENSIONS = [
    '.txt', '.json', '.xml', '.html', '.css', '.js', '.csv', '.log',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'
];

// Already compressed file extensions
const COMPRESSED_EXTENSIONS = [
    '.zip', '.rar', '.7z', '.gz', '.bz2', '.tar', '.tgz',
    '.jpg', '.jpeg', '.png', '.gif', '.mp3', '.mp4', '.avi', '.mkv'
];

function shouldCompress(filename, fileSize) {
    const ext = filename.toLowerCase();
    
    // Don't compress already compressed files
    if (COMPRESSED_EXTENSIONS.some(c => ext.endsWith(c))) {
        return false;
    }
    
    // Don't compress very small files (less than 1KB)
    if (fileSize < 1024) {
        return false;
    }
    
    // Check if file type is compressible
    return COMPRESSIBLE_EXTENSIONS.some(c => ext.endsWith(c));
}

function compressLossless(buffer) {
    return new Promise((resolve, reject) => {
        zlib.deflate(buffer, (err, compressed) => {
            if (err) {
                reject(err);
            } else {
                resolve(compressed);
            }
        });
    });
}

function decompressLossless(compressedBuffer) {
    return new Promise((resolve, reject) => {
        zlib.inflate(compressedBuffer, (err, decompressed) => {
            if (err) {
                reject(err);
            } else {
                resolve(decompressed);
            }
        });
    });
}

async function processCompression(buffer, filename) {
    if (!shouldCompress(filename, buffer.length)) {
        return {
            compressed: false,
            data: buffer,
            originalSize: buffer.length,
            compressedSize: buffer.length,
            compressionRatio: 1.0
        };
    }

    try {
        const compressed = await compressLossless(buffer);
        const compressionRatio = compressed.length / buffer.length;

        // Only use compression if it actually reduces size by at least 10%
        if (compressionRatio < 0.9) {
            return {
                compressed: true,
                data: compressed,
                originalSize: buffer.length,
                compressedSize: compressed.length,
                compressionRatio
            };
        } else {
            // Compression didn't help, return original
            return {
                compressed: false,
                data: buffer,
                originalSize: buffer.length,
                compressedSize: buffer.length,
                compressionRatio: 1.0
            };
        }
    } catch (error) {
        console.error('[COMPRESSION] Error:', error.message);
        // On error, return original uncompressed data
        return {
            compressed: false,
            data: buffer,
            originalSize: buffer.length,
            compressedSize: buffer.length,
            compressionRatio: 1.0,
            error: error.message
        };
    }
}

async function processDecompression(compressedBuffer, wasCompressed) {
    if (!wasCompressed) {
        return compressedBuffer;
    }

    try {
        return await decompressLossless(compressedBuffer);
    } catch (error) {
        console.error('[DECOMPRESSION] Error:', error.message);
        throw new Error('Failed to decompress data');
    }
}

module.exports = {
    shouldCompress,
    compressLossless,
    decompressLossless,
    processCompression,
    processDecompression
};