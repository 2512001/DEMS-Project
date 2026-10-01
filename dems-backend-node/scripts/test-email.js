require('dotenv').config();
const { sendEmail, verifySMTPConnection, isSMTPConfigured } = require('../services/emailService');

async function testEmail() {
    const to = process.argv[2] || process.env.SMTP_USER;
    console.log('[EMAIL TEST] SMTP configured:', isSMTPConfigured());
    console.log('[EMAIL TEST] Host:', process.env.SMTP_HOST);
    console.log('[EMAIL TEST] User:', process.env.SMTP_USER);
    console.log('[EMAIL TEST] To:', to);

    const verify = await verifySMTPConnection();
    console.log('[EMAIL TEST] Verify:', verify);

    const result = await sendEmail({
        to,
        subject: 'DEMS Email Test',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0ea5e9;">DEMS Email Test</h2>
                <p>This is a live SMTP test from the DEMS backend.</p>
                <p>If you received this, invitation and OTP emails can be delivered.</p>
            </div>
        `,
        text: 'This is a live SMTP test from the DEMS backend.'
    });

    console.log('[EMAIL TEST] Result:', result);
    if (!result.success) {
        process.exitCode = 1;
    }
}

testEmail().catch((error) => {
    console.error('[EMAIL TEST] Fatal:', error.message);
    process.exit(1);
});
