function mockAnalyze(fileBuffer, options = {}) {
    const originalName = String(options.originalName || '').toLowerCase();
    const forceSuspicious = originalName.includes('deepfake')
        || originalName.includes('tamper')
        || originalName.includes('fake')
        || process.env.MOCK_AI_FORCE === 'suspicious';

    if (forceSuspicious) {
        return {
            requested: true,
            authenticityScore: 31.2,
            tamperingScore: 87.5,
            deepfakeScore: 92.4,
            deepfakeDetected: true,
            tamperingDetected: true,
            confidence: 0.91,
            explanation: 'Potential manipulation indicators detected. This is an automated analysis and should not be treated as absolute legal proof.',
            modelName: 'dems-mock-ai',
            modelVersion: 'mock-v1',
            analyzedAt: new Date().toISOString(),
            score: 31.2,
            isDeepfake: true,
            metadataMatch: true,
            isDemo: true
        };
    }

    return {
        requested: true,
        authenticityScore: 96.4,
        tamperingScore: 2.1,
        deepfakeScore: 0.3,
        deepfakeDetected: false,
        tamperingDetected: false,
        confidence: 0.94,
        explanation: 'No significant manipulation indicators detected. This is an automated analysis and should not be treated as absolute legal proof.',
        modelName: 'dems-mock-ai',
        modelVersion: 'mock-v1',
        analyzedAt: new Date().toISOString(),
        score: 96.4,
        isDeepfake: false,
        metadataMatch: true,
        isDemo: true
    };
}

function normalizeRemoteAnalysis(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('AI service returned an empty analysis.');
    }

    return {
        requested: true,
        authenticityScore: Number(payload.authenticityScore ?? payload.score ?? 0),
        tamperingScore: Number(payload.tamperingScore ?? 0),
        deepfakeScore: Number(payload.deepfakeScore ?? 0),
        deepfakeDetected: Boolean(payload.deepfakeDetected || payload.isDeepfake),
        tamperingDetected: Boolean(payload.tamperingDetected),
        confidence: payload.confidence == null ? null : Number(payload.confidence),
        explanation: String(payload.explanation || 'AI analysis completed.'),
        modelName: String(payload.modelName || 'python-fastapi'),
        modelVersion: String(payload.modelVersion || payload.model || 'unknown'),
        analyzedAt: payload.analyzedAt || new Date().toISOString(),
        score: Number(payload.authenticityScore ?? payload.score ?? 0),
        isDeepfake: Boolean(payload.deepfakeDetected || payload.isDeepfake),
        metadataMatch: payload.metadataMatch !== false
    };
}

async function analyzeEvidence(fileBuffer, options = {}) {
    const endpoint = String(process.env.AI_SERVICE_URL || '').trim();
    if (!endpoint) {
        return mockAnalyze(fileBuffer, options);
    }

    try {
        const formData = new FormData();
        const fileName = String(options.originalName || 'evidence.bin');
        const blob = new Blob([fileBuffer], { type: options.mimeType || 'application/octet-stream' });
        formData.append('file', blob, fileName);
        formData.append('originalName', fileName);

        const headers = {};
        if (process.env.AI_SERVICE_TOKEN) {
            headers.Authorization = `Bearer ${process.env.AI_SERVICE_TOKEN}`;
        }

        const response = await fetch(`${endpoint.replace(/\/$/, '')}/analyze`, {
            method: 'POST',
            headers,
            body: formData
        });

        if (!response.ok) {
            throw new Error(`AI service HTTP ${response.status}`);
        }

        const payload = await response.json();
        return normalizeRemoteAnalysis(payload.data || payload);
    } catch (err) {
        const error = new Error('AI verification failed. The evidence was not modified.');
        error.statusCode = 502;
        throw error;
    }
}

function isSuspicious(aiAnalysis) {
    if (!aiAnalysis || aiAnalysis.requested === false) {
        return false;
    }

    return Boolean(aiAnalysis.deepfakeDetected || aiAnalysis.tamperingDetected);
}

function notRequestedAnalysis() {
    return {
        requested: false,
        authenticityScore: null,
        tamperingScore: null,
        deepfakeScore: null,
        deepfakeDetected: false,
        tamperingDetected: false,
        confidence: null,
        explanation: 'AI authenticity verification was not requested.',
        modelName: '',
        modelVersion: '',
        analyzedAt: null,
        score: 0,
        isDeepfake: false,
        metadataMatch: true
    };
}

module.exports = {
    analyzeEvidence,
    isSuspicious,
    notRequestedAnalysis
};
