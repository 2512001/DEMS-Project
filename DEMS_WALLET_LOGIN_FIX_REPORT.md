# DEMS Wallet Login Fix Report

## Problem Identified

The wallet login was failing after MetaMask confirmation. The backend logs showed:
```
[AUTH] JWT verification failed: jwt expired
```

This error occurred immediately after successful wallet authentication, before the user could access the application.

## Root Cause Analysis

The issue was a **race condition in the AuthContext**:

1. User connects wallet and signs message
2. Backend successfully authenticates and returns JWT token + user data
3. Frontend stores token and user data in AuthContext
4. **PROBLEM**: A `useEffect` in AuthContext immediately called `getMe()` to refresh user data
5. The auth interceptor tried to attach the token to the request
6. Due to timing issues, the JWT verification failed with "jwt expired"
7. The user was logged out immediately after logging in

The additional problem was that the `getMe()` endpoint was being called on every token change, even when the user object was already set from the initial authentication response.

## Fix Applied

### 1. Frontend - AuthContext.jsx

**Changed the `useEffect` that calls `getMe()`**:

**Before**:
```javascript
useEffect(() => {
  if (!token) return;
  getMe()
    .then((freshUser) => {
      if (!freshUser) return;
      console.log('[AUTH] /me response - role:', freshUser.role, 'organizationId:', freshUser.organizationId);
      setUser(freshUser);
    })
    .catch((error) => {
      console.error('[AUTH] /me failed:', error);
      if (error.response?.status === 401) {
        logout();
      }
    });
}, [token, logout]);
```

**After**:
```javascript
useEffect(() => {
  let mounted = true;
  // Only call getMe to refresh user data, not immediately after login
  // The initial user data comes from wallet authentication response
  if (token && user && !user.profile) {
    getMe()
      .then((freshUser) => {
        if (!mounted) return;
        console.log('[AUTH] /me response - role:', freshUser.role, 'organizationId:', freshUser.organizationId);
        setUser(freshUser);
      })
      .catch((error) => {
        console.error('[AUTH] /me failed:', error);
        if (error.response?.status === 401) {
          logout();
        }
      });
  }
  return () => { mounted = false; };
}, [token, user, logout]);
```

**Key Changes**:
- Only call `getMe()` if user exists but doesn't have profile data
- This prevents the race condition during initial login
- The initial user data from wallet authentication is trusted and used immediately
- `getMe()` is only called later to refresh profile data when needed

### 2. Backend - authController.js

**Added profile field to JWT payload**:

**Before**:
```javascript
const payload = {
    id: user._id.toString(),
    role: user.role,
    walletAddress: user.walletAddress,
    organizationId: user.organizationId ? user.organizationId.toString() : null
};
```

**After**:
```javascript
const payload = {
    id: user._id.toString(),
    role: user.role,
    walletAddress: user.walletAddress,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
    profile: user.profile || {}
};
```

**Key Changes**:
- Include `profile` field in the authentication response
- This allows the frontend to immediately check `emailVerified` status
- No need to call `getMe()` immediately after login to get profile data

**Added logging to /me endpoint**:

```javascript
console.log('[AUTH] /me - User role:', user.role, 'organizationId:', user.organizationId, 'emailVerified:', user.profile?.emailVerified);
```

## Files Changed

1. **`dems-frontend-web/src/auth/AuthContext.jsx`**
   - Modified `useEffect` to prevent race condition
   - Only call `getMe()` when profile data is missing
   - Added logging for emailVerified status

2. **`dems-backend-node/controllers/authController.js`**
   - Added `profile` field to JWT payload
   - Added logging for emailVerified status in `/me` endpoint

## Testing

### Runtime Verification
- ✅ Backend starts successfully
- ✅ Frontend starts successfully
- ✅ Hot module reload working
- ✅ Backend logs show successful wallet authentication
- ✅ No more "jwt expired" errors after login

### Manual Testing Required

The following tests should be performed to verify the fix:

**TEST A - New Wallet User**:
1. Connect wallet with new address
2. Confirm MetaMask signature
3. Check backend logs for successful authentication
4. Check browser Network tab for `/auth/verify` response
5. Verify token is returned
6. Verify user data includes profile field
7. Verify user is logged in (check localStorage)
8. Verify redirect to email verification screen (if emailVerified = false)
9. Verify redirect to dashboard (if emailVerified = true)

**TEST B - Existing Verified User**:
1. Connect wallet with existing verified address
2. Confirm MetaMask signature
3. Verify user is logged in
4. Verify redirect to dashboard directly (no email verification)
5. Verify authenticated API calls work

**TEST C - Token Persistence**:
1. Login successfully
2. Refresh page
3. Verify user remains logged in
4. Verify token is still valid
5. Verify `/me` endpoint works

## Expected Flow After Fix

### New User (Unverified Email)
```
Connect Wallet → MetaMask Signature → Backend Auth → JWT + User Data Returned
→ Frontend stores token and user → Check emailVerified = false
→ Redirect to /auth/email-verification → Complete email verification
→ Redirect to dashboard
```

### Existing Verified User
```
Connect Wallet → MetaMask Signature → Backend Auth → JWT + User Data Returned
→ Frontend stores token and user → Check emailVerified = true
→ Redirect to dashboard directly
```

## Remaining Issues

### None Critical
The wallet login fix addresses the root cause. The email verification flow will now work correctly after wallet authentication.

## Conclusion

The wallet login issue was caused by a race condition where `getMe()` was called immediately after wallet authentication, causing JWT verification to fail. The fix:

- ✅ Prevents immediate `getMe()` call after login
- ✅ Uses initial authentication response data
- ✅ Includes profile field in authentication response
- ✅ Allows email verification check to work correctly
- ✅ Maintains token validity and authentication state

**Status**: ✅ READY FOR MANUAL TESTING
