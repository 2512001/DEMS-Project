const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const EvidenceModel = require('../model/evidenceModel');
const { PinataSDK } = require("pinata");
const { Blob, File } = require("buffer");
const mongoose = require('mongoose');
const pinata = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT,
    pinataGateway: process.env.GATEWAY_URL
});



function decryptFile(encryptedBuffer, encryptionObj) {
    console.log(encryptedBuffer);
    console.log(encryptionObj);
    const decipher = crypto.createDecipheriv(
        encryptionObj.algorithm,
        getEncryptionKey(),
        Buffer.from(encryptionObj.iv, "hex")
    );

    decipher.setAuthTag(
        Buffer.from(encryptionObj.authTag, "hex")
    );

    return Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
    ]);
}


const parseCaptureMetadata = (rawMetadata) => {
    if (!rawMetadata) {
        throw new Error('captureMetadata is required.');
    }

    const metadata = typeof rawMetadata === 'string' ? JSON.parse(rawMetadata) : rawMetadata;
    const latitude = Number(metadata?.gpsLocation?.latitude);
    const longitude = Number(metadata?.gpsLocation?.longitude);
    const capturedAt = new Date(metadata?.capturedAt);

    if (!metadata.deviceInfo || Number.isNaN(latitude) || Number.isNaN(longitude) || Number.isNaN(capturedAt.getTime())) {
        throw new Error('captureMetadata must include deviceInfo, gpsLocation.latitude, gpsLocation.longitude, and capturedAt.');
    }

    return {
        deviceInfo: String(metadata.deviceInfo).slice(0, 300),
        gpsLocation: { latitude, longitude },
        capturedAt
    };
};

const getFileBuffer = (file) => {
    if (file.buffer) return file.buffer;
    if (file.path) return fs.readFileSync(file.path);
    throw new Error('Uploaded file could not be read.');
};

const getEncryptionKey = () => {
    const configuredKey = process.env.EVIDENCE_AES_KEY;

    if (configuredKey) {
        const key = Buffer.from(configuredKey, 'hex');
        console.log(key);
        if (key.length !== 32) {
            throw new Error('EVIDENCE_AES_KEY must be a 32-byte hex encoded key.');
        }
        return key;
    }

    console.warn('[SECURITY] EVIDENCE_AES_KEY is not configured. Using JWT_SECRET-derived development key.');
    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'dems-development-key').digest();
};

const encryptBuffer = (buffer) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
        encryptedBuffer: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: 'aes-256-gcm'
    };
};

const uploadEncryptedBlobToPinata = async (encryptedBuffer, originalName) => {
    if (!process.env.PINATA_JWT) {
        const mockCID = `mock-${crypto.createHash('sha256').update(encryptedBuffer).digest('hex').slice(0, 46)}`;
        console.warn(`[IPFS] PINATA_JWT not configured. Returning development CID=${mockCID}`);
        return mockCID;
    }


    const blob = new Blob([encryptedBuffer]);
    const file = new File([blob], originalName, {
        type: "application/octet-stream"
    })
    const upload = await pinata.upload.public.file(file);
    return upload.cid;
};

const runMockAiVerification = async () => {
    return {
        score: 98.5,
        deepfake_detected: false,
        metadata_match: true,
        message: 'Mock Verification Engine'
    };
};

const cleanupUploadedFile = (file) => {
    if (!file?.path) return;

    fs.unlink(file.path, (err) => {
        if (err) console.error('[-] Failed to delete temporary upload:', err.message);
    });
};

const uploadEvidence = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No evidence file provided.' });
        }

        const captureMetadata = parseCaptureMetadata(req.body.captureMetadata);
        const caseId = req.body.caseId ? String(req.body.caseId).trim().slice(0, 120) : null;
        const fileBuffer = getFileBuffer(req.file);

        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        const UploaderWallet = req.user?.walletAddress.toLowerCase();

        const duplicate = await EvidenceModel.findOne({ fileHash });
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'Duplicate file detected. This evidence already exists in DEMS.'
            });
        }

        const isGoldenPipeline = 'admin';
        const aiData = isGoldenPipeline
            ? await runMockAiVerification(fileBuffer, captureMetadata)
            : { score: 0, deepfake_detected: false, metadata_match: true, message: 'Citizen vault upload. AI not required.' };

        if (isGoldenPipeline && aiData.deepfake_detected) {
            console.warn(`[EVIDENCE] AI flagged upload wallet=${UploaderWallet} hash=${fileHash}`);
            return res.status(422).json({
                success: false,
                message: 'AI engine detected potential deepfake or manipulation.',
                aiAnalysis: aiData
            });
        }

        const encrypted = encryptBuffer(fileBuffer);

        const ipfsCID = await uploadEncryptedBlobToPinata(encrypted.encryptedBuffer, req.file.originalname);
        cleanupUploadedFile(req.file);



        const status = isGoldenPipeline ? 'pending_blockchain' : 'encrypted';
        const statusMessage = isGoldenPipeline
            ? 'Encrypted evidence pinned to IPFS. Awaiting frontend MetaMask blockchain transaction.'
            : 'Encrypted citizen vault file pinned to IPFS.';

        const evidence = await EvidenceModel.create({
            user: req.user.id,
            UploaderWallet,
            caseId,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            fileHash,
            captureMetadata,
            ipfsCID,
            encryption: {
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                algorithm: encrypted.algorithm
            },
            aiAnalysis: {
                score: aiData.score,
                isDeepfake: aiData.deepfake_detected,
                metadataMatch: aiData.metadata_match !== undefined ? aiData.metadata_match : true
            },
            status,
            statusMessage
        });

        console.log(`[EVIDENCE] Uploaded role=${'admin'} wallet=${UploaderWallet} evidenceId=${evidence._id} status=${status}`);

        const responseData = {
            evidenceId: evidence._id,
            fileName: evidence.fileName,
            fileHash: evidence.fileHash,
            ipfsCID: evidence.ipfsCID,
            status: evidence.status,
            statusMessage: evidence.statusMessage,
            aiAnalysis: evidence.aiAnalysis
        };

        if (isGoldenPipeline) {
            responseData.blockchainPayload = {
                evidenceId: evidence._id.toString(),
                fileHash: evidence.fileHash,
                ipfsCID: evidence.ipfsCID,
                aiScore: evidence.aiAnalysis.score,
                UploaderWallet: evidence.UploaderWallet
            };
        }

        return res.status(201).json({
            success: true,
            message: isGoldenPipeline
                ? 'Golden Pipeline complete. Use blockchainPayload on the frontend to prompt MetaMask.'
                : 'Simple Vault upload complete.',
            data: responseData
        });
    } catch (err) {
        if (err instanceof SyntaxError || err.message.includes('captureMetadata') || err.message.includes('EVIDENCE_AES_KEY')) {
            return res.status(400).json({ success: false, message: err.message });
        }

        next(err);
    } finally {
        cleanupUploadedFile(req.file);
    }
};

const getMyFiles = async (req, res, next) => {
    try {


        const walletAddress = req.user?.walletAddress.toLowerCase();
        // Production:
        // req.user.walletAddress.toLowerCase();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;


        const filter = {
            UploaderWallet: walletAddress
        };

        const totalRecords =
            await EvidenceModel.countDocuments(filter);



        const evidence = await EvidenceModel.find(filter)
            .select(
                "_id fileName ipfsCID fileHash fileSize mimeType  status createdAt caseId"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log(
            `[EVIDENCE] My files wallet=${walletAddress} count=${evidence.length}`
        );

        return res.status(200).json({
            success: true,
            count: evidence.length,
            data: evidence,
            pagination: {
                page,
                limit,
                totalRecords,
                totalPages: Math.ceil(
                    totalRecords / limit
                ),
                hasNextPage:
                    page <
                    Math.ceil(totalRecords / limit),
                hasPrevPage: page > 1
            }
        });

    } catch (err) {
        console.error("[GET_MY_FILES_ERROR]", err);
        next(err);
    }
};


const getEvidenceById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const evidence = await EvidenceModel.findById(id)
            .select(
                "_id fileName  ipfsCID  encryption fileSize mimeType status createdAt caseId"
            );


        // if (
        //     evidence.UploaderWallet !== "0xdac1fd5ea8009d39c6b00b773ac6e6c123ed38e0" //req.use.walletAddress
        //                 return res.status(403).json({success : false , message : "connect with wallet"})

        // ) {
        //     return res.status(403).json({success : false , message : "connect with wallet"})
        // }


        if (!evidence) {
            return res.status(404).json({
                success: false,
                message: "Evidence not found"
            });
        }


        const encryptedfiledata = await pinata.gateways.public.get(evidence.ipfsCID);

        const encryptedBlob = encryptedfiledata.data;

        const encryptedBuffer = Buffer.from(
            await encryptedBlob.arrayBuffer()
        );

        const originalBuffer = decryptFile(encryptedBuffer, evidence.encryption);

        console.log(originalBuffer);


        const base64File =
            originalBuffer.toString("base64");

            console.log(base64File.length);
            console.log(originalBuffer.length);

        const value = {
            success: true,
            data: {
                ...evidence.toObject(),
                fileContent: base64File
            }
        };


        return res.status(200).json(value);


        // res.setHeader(
        //     "Content-Type",
        //     evidence.mimeType
        // );

        // return res.status(200).send(originalBuffer);

    } catch (err) {
        console.error("[GET_EVIDENCE_ERROR]", err);
        next(err);
    }
};

const getEvidenceByCase = async (req, res, next) => {
    try {
        const caseId = String(req.params.caseId || '').trim();

        if (!caseId || caseId.length > 120) {
            return res.status(400).json({ success: false, message: 'Valid caseId is required.' });
        }

        const evidence = await EvidenceModel.find({ caseId }).sort({ createdAt: -1 });

        console.log(`[EVIDENCE] Case lookup caseId=${caseId} requester=${req.user.walletAddress} count=${evidence.length}`);

        return res.status(200).json({ success: true, count: evidence.length, data: evidence });
    } catch (err) {
        next(err);
    }
};

const finalizeEvidence = async (req, res, next) => {
    try {
        const evidenceId = String(req.params.evidenceId || '').trim();
        const txHash = String(req.body.txHash || '').trim();

        //user is true
        //
        if (!txHash.startsWith('0x') || txHash.length !== 66) {
            return res.status(400).json({ success: false, message: 'Valid blockchain transaction hash is required.' });
        }

        const evidence = await EvidenceModel.findById(evidenceId);

        if (!evidence) {
            return res.status(404).json({ success: false, message: 'Evidence record not found.' });
        }

        console.log(evidence);

        const ownsEvidence = [evidence.UploaderWallet]
            .filter(Boolean)
            .map((value) => value.toLowerCase())
            .includes(req.user.walletAddress.toLowerCase());

        console.log("user here", req.user);
        console.log("req.user.walletAddress =", req.user.walletAddress);
        console.log("evidence.uploaderWallet =", evidence.UploaderWallet);
        console.log("ownsEvidence =", ownsEvidence);

        if (!ownsEvidence && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'You are not authorized to finalize this evidence.' });
        }

        evidence.blockchainTxHash = txHash;
        evidence.status = 'stored_on_chain';
        evidence.statusMessage = 'Blockchain transaction confirmed and stored.';
        await evidence.save();

        console.log(`[EVIDENCE] Finalized evidenceId=${evidence._id} txHash=${txHash}`);

        return res.status(200).json({
            success: true,
            message: 'Evidence finalized on-chain.',
            data: evidence
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEvidenceById,
    uploadEvidence,
    getMyFiles,
    getEvidenceByCase,
    finalizeEvidence
};
