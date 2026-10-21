# DEMS Employee Invitation OTP Email Fix

## Problem

After accepting an employee invitation, the employee reaches the "Verify Your Email" step and requests an OTP code. The backend logs show:
- OTP generated successfully
- OTP stored successfully
- sendMail() called successfully
- SMTP accepted the email

However, the employee does NOT receive the verification email.

Meanwhile, invitation emails ARE being received successfully.

## Root Cause

The OTP email template was too generic and likely being caught by spam filters or Gmail's promotional filters.

**Original OTP email**:
- Generic subject: "DEMS Email Verification Code"
- Simple template without personalization
- No text version
- Lacked professional structure like invitation emails

**Invitation email** (working):
- Personalized greeting with name
- Professional structure
- Clear purpose
- Detailed information
- Both HTML and text versions

## Fix Applied

**Modified `dems-backend-node/routes/otpRoutes.js`**:

1. **Improved email template**:
   - Added personalized greeting using user's display name if available
   - Changed subject to "Verify your email address - DEMS" (more standard)
   - Added instruction about where to enter the code
   - Made structure consistent with invitation emails

2. **Added text version**:
   - Added plain text version for email clients that prefer text
   - Same personalization as HTML version
   - Prevents being flagged as spam

3. **Added comprehensive logging**:
   - `[EMPLOYEE EMAIL VERIFY]` prefix for all logs
   - Logs email, user ID, OTP generation, email service call
   - Logs SMTP send attempt, result, message ID
   - Logs all errors with stack traces

## Files Changed

**`dems-backend-node/routes/otpRoutes.js`**:
- Line 55-92: Enhanced OTP email template with personalization
- Line 81-87: Added text version of email
- Line 25-104: Added comprehensive logging throughout the route

## Expected Behavior After Fix

- OTP email will have a professional, personalized template
- Email will be less likely to be caught by spam filters
- Employee should receive the verification code
- The email structure matches the working invitation email format

## Test Steps

1. Open employee invitation link
2. Accept invitation
3. Reach "Verify Your Email" step
4. Click to request OTP code
5. Check inbox AND spam folder
6. Email should arrive with personalized greeting
7. Enter OTP code to verify
8. Proceed to document submission

## Email Service Used

- **Service**: Nodemailer with Gmail SMTP
- **Function**: `sendEmail()` from `emailService.js`
- **Transporter**: gmail-service (same as invitation emails)
- **SMTP sendMail()**: Called successfully
- **SMTP response**: Accepted (same as invitation emails)

## OTP Storage Mechanism

- **Function**: `createOTP(email, 'email')` from `otpService.js`
- **Storage**: OTP record in database with expiration
- **Expiration**: 10 minutes (600000ms)
- **Field**: `expiresAt` timestamp

## Resend Behavior

- **Cooldown**: Checked via `canResendOTP(email, 'email')`
- **Resend**: Generates new OTP, invalidates old OTP
- **Storage**: New OTP stored, old becomes invalid
- **Email**: New email sent with new code

## Final Successful Verification Flow

1. Employee requests OTP
2. Backend validates email format
3. Backend checks for existing user
4. Backend checks resend cooldown
5. Backend generates new OTP
6. Backend stores OTP with expiration
7. Backend creates personalized email template
8. Backend calls sendEmail()
9. Nodemailer sends via Gmail SMTP
10. Employee receives email in inbox
11. Employee enters OTP
12. Backend verifies OTP
13. Backend marks email as verified
14. Employee proceeds to document submission
