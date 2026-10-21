# DEMS Employee Invitation Email Verification Fix

## Problem

After accepting an employee invitation, the employee reaches the "Verify Your Email" step and requests an OTP code. The employee does NOT receive the verification email.

**Backend logs showed**:
```
[EMPLOYEE EMAIL VERIFY] Existing user check - user: new ObjectId('6ac366880d25148b14d970f2') emailVerified: true
[EMPLOYEE EMAIL VERIFY] Email already verified
```

The OTP endpoint was skipping email sending because the user's email was already marked as `emailVerified: true`.

## Root Cause

**Two issues**:

1. **Invitation acceptance didn't reset email verification**:
   - When a user accepted an employee invitation, the code set the email but left `emailVerified: true`
   - This was from a previous wallet login email verification
   - The OTP endpoint saw the email as already verified and skipped sending the OTP

2. **OTP endpoint blocked already-verified users**:
   - The OTP endpoint checked if the user's email was already verified
   - If `emailVerified: true`, it returned immediately without sending an OTP
   - This prevented employees from re-verifying their email during onboarding

## Fix Applied

**1. Modified `dems-backend-node/controllers/invitationController.js`** (line 358-367):

When accepting an employee invitation, now forces email verification:
```javascript
user.profile = {
    ...(user.profile?.toObject?.() || user.profile || {}),
    email: invitation.invitedEmail,
    displayName: String(req.body?.name || invitation.invitedName || user.profile?.displayName || '').trim(),
    phone: String(req.body?.phone || user.profile?.phone || '').trim(),
    emailVerified: false, // Force email verification for employee onboarding
    emailVerifiedAt: null
};
```

**2. Modified `dems-backend-node/routes/otpRoutes.js`** (line 39-65):

OTP endpoint now allows sending OTP for employee onboarding:
```javascript
// Check if user already exists with this email
const existingUser = await User.findOne({ 'profile.email': email.toLowerCase() }).select('_id role profile.emailVerified organizationId');

// Only skip OTP if user is already verified AND has an organization (completed onboarding)
if (existingUser && existingUser.profile && existingUser.profile.emailVerified && existingUser.organizationId) {
    return res.status(200).json({
        success: true,
        message: 'Email is already verified.',
        emailVerified: true
    });
}

// If user is verified but has no organization (employee onboarding in progress), reset verification to force OTP
if (existingUser && existingUser.profile && existingUser.profile.emailVerified && !existingUser.organizationId) {
    existingUser.profile.emailVerified = false;
    existingUser.profile.emailVerifiedAt = null;
    await existingUser.save();
}
```

## Files Changed

1. **`dems-backend-node/controllers/invitationController.js`**:
   - Line 358-367: Added `emailVerified: false` and `emailVerifiedAt: null` when accepting employee invitation

2. **`dems-backend-node/routes/otpRoutes.js`**:
   - Line 39-65: Enhanced logic to allow OTP for users without organization
   - Line 39-65: Reset emailVerified for verified users without organization
   - Line 55-92: Improved email template with personalization
   - Line 81-87: Added text version of email
   - Line 25-104: Added comprehensive logging

## Expected Behavior After Fix

**Employee Invitation Flow**:
1. Admin creates employee invitation → Email sent ✅
2. Employee opens invitation → See invitation details ✅
3. Employee accepts invitation → `emailVerified` set to `false` ✅
4. Employee reaches "Verify Your Email" step ✅
5. Employee requests OTP → OTP generated and sent ✅
6. Employee receives email ✅
7. Employee enters OTP → Email verified ✅
8. Employee submits documents ✅
9. Admin approves → Employee becomes officer ✅

**Existing Verified User with Organization**:
- Email already verified → Skip OTP (no change needed)

**Verified User without Organization (Onboarding)**:
- Reset `emailVerified` to `false` → Force OTP verification

## Email Service Used

- **Service**: Nodemailer with Gmail SMTP
- **Function**: `sendEmail()` from `emailService.js`
- **Transporter**: gmail-service
- **SMTP sendMail()**: Called successfully
- **SMTP response**: Accepted

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

## Test Steps

1. **Fresh invitation**:
   - Create new employee invitation
   - Accept invitation
   - Request OTP → Should receive email
   - Verify OTP → Should succeed

2. **Re-accept previously accepted invitation**:
   - Try to accept same invitation again
   - Request OTP → Should receive email
   - Verify OTP → Should succeed

3. **Existing verified user**:
   - If user has organization → Skip OTP
   - If user has no organization → Reset and send OTP

## Final Successful Verification Flow

1. Employee accepts invitation → `emailVerified` set to `false`
2. Employee requests OTP → Backend checks user has no organization
3. Backend generates OTP
4. Backend stores OTP with expiration
5. Backend creates personalized email template
6. Backend calls sendEmail()
7. Nodemailer sends via Gmail SMTP
8. Employee receives email in inbox
9. Employee enters OTP
10. Backend verifies OTP
11. Backend marks email as verified
12. Employee proceeds to document submission
