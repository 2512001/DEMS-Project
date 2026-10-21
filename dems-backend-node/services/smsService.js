// SMS delivery service.
//
// Supports two configurable providers without adding a hard dependency:
//   1. Twilio REST API (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)
//   2. A generic HTTP webhook (SMS_API_URL, SMS_API_KEY, optional SMS_FROM)
//
// Contract: sendSms() returns one of:
//   { status: 'sent', providerId }                        - provider confirmed submission
//   { status: 'failed', error }                           - provider rejected / network error
//   { status: 'not_configured' }                          - no provider credentials present
//
// It NEVER returns 'sent' unless the provider confirmed delivery, and it never
// logs or returns the OTP/message body.

function twilioConfigured() {
    return Boolean(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_FROM_NUMBER
    );
}

function genericConfigured() {
    return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

function isSmsConfigured() {
    return twilioConfigured() || genericConfigured();
}

async function sendViaTwilio(to, body) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const params = new URLSearchParams({ To: to, From: from, Body: body });

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    const payload = await response.json().catch(() => ({}));

    // Twilio returns a message SID and a status; a 2xx with a sid means it accepted the message.
    if (response.ok && payload.sid && payload.status !== 'failed' && payload.status !== 'undelivered') {
        return { status: 'sent', providerId: payload.sid };
    }

    return {
        status: 'failed',
        error: payload.message || `Twilio responded with HTTP ${response.status}.`
    };
}

async function sendViaGeneric(to, body) {
    const response = await fetch(process.env.SMS_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.SMS_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to, from: process.env.SMS_FROM || undefined, message: body })
    });

    if (response.ok) {
        const payload = await response.json().catch(() => ({}));
        return { status: 'sent', providerId: payload.id || payload.messageId || null };
    }

    return { status: 'failed', error: `SMS provider responded with HTTP ${response.status}.` };
}

async function sendSms(to, body) {
    if (!isSmsConfigured()) {
        return { status: 'not_configured' };
    }

    try {
        if (twilioConfigured()) {
            return await sendViaTwilio(to, body);
        }
        return await sendViaGeneric(to, body);
    } catch (err) {
        // Do not surface the message body; only the transport failure reason.
        return { status: 'failed', error: `SMS delivery failed: ${err.message}` };
    }
}

module.exports = {
    isSmsConfigured,
    sendSms
};
