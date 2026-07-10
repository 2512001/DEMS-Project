const { spawn } = require('child_process');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const User = require('../model/userModel');

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/DEMS';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForServer = async (server, stdout, stderr) => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        if (server.exitCode !== null) {
            throw new Error(`Server exited early.\nSTDOUT:\n${stdout()}\nSTDERR:\n${stderr()}`);
        }

        try {
            const response = await fetch(`${baseUrl}/api/auth/nonce/0x000000000000000000000000000000000000dEaD`);
            if (response.status < 500) return;
        } catch (err) {
            await sleep(500);
        }
    }

    throw new Error(`Server did not become ready.\nSTDOUT:\n${stdout()}\nSTDERR:\n${stderr()}`);
};

const login = async (wallet) => {
    const nonceResponse = await fetch(`${baseUrl}/api/auth/nonce/${wallet.address}`);
    const nonceBody = await nonceResponse.json();
    const signature = await wallet.signMessage(nonceBody.message);

    const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ walletAddress: wallet.address, signature })
    });

    const verifyBody = await verifyResponse.json();
    return { status: verifyResponse.status, token: verifyBody.token, user: verifyBody.user };
};

const uploadEvidence = async (token, label, caseId) => {
    const formData = new FormData();
    formData.append('evidence', new Blob([Buffer.from(`${label} ${Date.now()}`)], { type: 'text/plain' }), `${label}.txt`);
    formData.append('caseId', caseId);
    formData.append('captureMetadata', JSON.stringify({
        deviceInfo: 'DEMS smoke-test device',
        gpsLocation: { latitude: 19.076, longitude: 72.8777 },
        capturedAt: new Date().toISOString()
    }));

    const response = await fetch(`${baseUrl}/api/evidence/upload`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: formData
    });

    return { status: response.status, body: await response.json() };
};

const run = async () => {
    const server = spawn(process.execPath, ['App.js'], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    server.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    server.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    try {
        await waitForServer(server, () => stdout, () => stderr);

        await mongoose.connect(mongoUri);

        const adminWallet = ethers.Wallet.createRandom();
        const officerWallet = ethers.Wallet.createRandom();
        const citizenWallet = ethers.Wallet.createRandom();

        await fetch(`${baseUrl}/api/auth/nonce/${adminWallet.address}`);
        await fetch(`${baseUrl}/api/auth/nonce/${officerWallet.address}`);
        await User.findOneAndUpdate(
            { walletAddress: adminWallet.address.toLowerCase() },
            { $set: { role: 'admin' } }
        );

        const admin = await login(adminWallet);
        const citizen = await login(citizenWallet);

        const upgradeResponse = await fetch(`${baseUrl}/api/admin/upgrade-officer`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                authorization: `Bearer ${admin.token}`
            },
            body: JSON.stringify({ walletAddress: officerWallet.address })
        });
        const upgradeBody = await upgradeResponse.json();

        const officer = await login(officerWallet);

        const citizenMyFiles = await fetch(`${baseUrl}/api/evidence/my-files`, {
            headers: { authorization: `Bearer ${citizen.token}` }
        });

        const citizenCaseDenied = await fetch(`${baseUrl}/api/evidence/case/CASE-SMOKE-001`, {
            headers: { authorization: `Bearer ${citizen.token}` }
        });

        const citizenUpload = await uploadEvidence(citizen.token, 'citizen-vault', 'CITIZEN-SMOKE-001');
        const officerUpload = await uploadEvidence(officer.token, 'officer-golden', 'CASE-SMOKE-001');

        const officerCaseResponse = await fetch(`${baseUrl}/api/evidence/case/CASE-SMOKE-001`, {
            headers: { authorization: `Bearer ${officer.token}` }
        });
        const officerCaseBody = await officerCaseResponse.json();

        const report = {
            adminLogin: { status: admin.status, role: admin.user?.role, hasToken: Boolean(admin.token) },
            upgradeOfficer: { status: upgradeResponse.status, role: upgradeBody.user?.role },
            officerLogin: { status: officer.status, role: officer.user?.role, hasToken: Boolean(officer.token) },
            citizenMyFiles: { status: citizenMyFiles.status },
            citizenCaseDenied: { status: citizenCaseDenied.status },
            citizenUpload: {
                status: citizenUpload.status,
                message: citizenUpload.body.message,
                evidenceStatus: citizenUpload.body.data?.status,
                hasBlockchainPayload: Boolean(citizenUpload.body.data?.blockchainPayload)
            },
            officerUpload: {
                status: officerUpload.status,
                message: officerUpload.body.message,
                evidenceStatus: officerUpload.body.data?.status,
                hasBlockchainPayload: Boolean(officerUpload.body.data?.blockchainPayload)
            },
            officerCase: { status: officerCaseResponse.status, count: officerCaseBody.count }
        };

        console.log(JSON.stringify(report, null, 2));
    } catch (err) {
        err.message = `${err.message}\nSERVER_STDOUT:\n${stdout}\nSERVER_STDERR:\n${stderr}`;
        throw err;
    } finally {
        await mongoose.disconnect().catch(() => {});
        if (!server.killed) server.kill();
    }
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
