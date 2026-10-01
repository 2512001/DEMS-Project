# Email Configuration Fix Guide

## Issue: Gmail Authentication Failed

**Error:** `Invalid login: 535-5.7.8 Username and Password not accepted`

## Root Cause
Gmail requires App Passwords for third-party applications, not regular passwords. Your current password is being rejected by Gmail's security.

## Step-by-Step Fix

### 1. Enable 2-Factor Authentication (2FA)
1. Go to https://myaccount.google.com/security
2. Find "2-Step Verification" and enable it
3. Follow the setup process (phone number, backup codes, etc.)

### 2. Create an App Password
1. Go to https://myaccount.google.com/apppasswords
2. Sign in with your Google account if prompted
3. Under "Select app", choose "Mail"
4. Under "Select device", choose "Other (Custom name)"
5. Enter "DEMS" as the custom name
6. Click "Generate"
7. **Copy the 16-character App Password** (e.g., `abcd efgh ijkl mnop`)

### 3. Update .env File
Replace your current SMTP_PASSWORD with the new App Password:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=dipakgiree41@gmail.com
SMTP_PASSWORD=your-16-char-app-password-here  # Remove spaces!
EMAIL_FROM=DEMS <dipakgiree41@gmail.com>
```

**Important:** Remove spaces from the App Password when adding to .env
- If App Password is: `abcd efgh ijkl mnop`
- In .env use: `abcdefghijklmnop`

### 4. Test the Configuration
```bash
cd dems-backend-node
node scripts/test-email.js
```

### 5. Restart Backend
```bash
cd dems-backend-node
npm run dev
```

## Alternative Email Providers

If Gmail continues to have issues, consider these alternatives:

### SendGrid (Free tier available)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=DEMS <noreply@yourdomain.com>
```

### Mailgun (Free tier available)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@yourdomain.mailgun.org
SMTP_PASSWORD=your-mailgun-password
EMAIL_FROM=DEMS <noreply@yourdomain.com>
```

## Current Status
- ✅ Email service code is correct
- ✅ SMTP configuration is properly implemented
- ❌ Gmail authentication needs App Password (user action required)

## Next Steps
1. Enable 2FA on your Google account
2. Generate App Password from Google App Passwords page
3. Update .env with the new App Password
4. Test with the test-email.js script
5. Verify invitation emails are sent successfully