# DEMS Root Cause Investigation Report

## Executive Summary

Two confirmed root causes identified:

1. **Image Redirect Bug**: Route `/admin/evidence/:evidenceId` is **missing** from App.jsx despite EvidenceTable linking to it
2. **Group Association Security Gap**: Backend accepts any groupId from frontend without validation that it belongs to the user's organization

---

## Issue 1: Image Redirect Bug

### Traced Flow

1. **Frontend Click Handler** (EvidenceTable.jsx):
   - Line 87: `const to = isQuarantine ? '/officer/pending-reviews' : \`${detailsBase}/${file._id}\`;`
   - Line 95-97: `<Link to={to} className="...">` wraps the file name
   - Line 137-139: `<Link to={to} className="...">` wraps the "Open" button
   - In OrgEvidence.jsx line 210: `detailsBase="/admin/evidence"`
   - Result: Links generate `/admin/evidence/<evidenceId>`

2. **React Router Configuration** (App.jsx):
   - Line 80: `<Route path="/admin/evidence" element={<OrgEvidence />} />`
   - **MISSING**: No route for `/admin/evidence/:evidenceId`
   - Line 99: `<Route path="*" element={<Navigate to="/" replace />} />`

3. **Route Resolution**:
   - User clicks link → navigates to `/admin/evidence/<evidenceId>`
   - React Router searches for matching route
   - `/admin/evidence` does NOT match `/admin/evidence/<evidenceId>` (path is exact, not wildcard)
   - Falls through to wildcard route `*`
   - Wildcard redirects to `/` (landing page)
   - Landing page's auth check or RequireAuth redirects to login

### Confirmed Root Cause

**File**: `dems-frontend-web/src/App.jsx`
**Function**: Route configuration
**Failing Condition**: Route `/admin/evidence/:evidenceId` does not exist

**Evidence**:
- App.jsx line 80 shows only `<Route path="/admin/evidence" element={<OrgEvidence />} />`
- EvidenceTable generates `/admin/evidence/:evidenceId` links
- React Router falls through to wildcard route
- Previous "fix" claimed to add this route but current code shows it was never added

### Expected Fix

Add route in App.jsx under the admin routes section:
```jsx
<Route path="/admin/evidence/:evidenceId" element={<EvidenceDetails />} />
```

This route must be placed within the same RequireAuth block as `/admin/evidence` (line 73-86).

---

## Issue 2: Group Association Security Gap

### Traced Flow

1. **Frontend Upload** (UploadEvidence.jsx):
   - Line 74: `const [selectedGroup, setSelectedGroup] = useState('');`
   - Line 260: `if (selectedGroup) formData.append('groupId', selectedGroup);`
   - Frontend sends groupId in FormData

2. **Backend Processing** (evidencePipelineService.js):
   - Line 275: `groupId: body.groupId || null,`
   - **NO VALIDATION** before passing to createTrustedEvidence
   - createTrustedEvidence (line 127) stores groupId directly in database

3. **Missing Security Check**:
   - No check that groupId exists in database
   - No check that groupId belongs to user's organization
   - No check that user is a member of the group
   - Frontend can send arbitrary groupId from any organization

### Confirmed Root Cause

**File**: `dems-backend-node/services/evidencePipelineService.js`
**Function**: `processEvidenceUpload`
**Failing Condition**: groupId from frontend is passed directly to createTrustedEvidence without validation

**Evidence**:
- Line 275: `groupId: body.groupId || null,` trusts frontend value completely
- No Group.findById() call before evidence creation
- No organization membership check
- Previous "fix" claimed to add validation but current code shows no validation logic

### Expected Fix

Add validation in evidencePipelineService.js before line 267:
```javascript
// Validate groupId if provided
let groupId = null;
if (body.groupId) {
    const Group = require('../model/groupModel');
    const group = await Group.findById(body.groupId);
    if (!group) {
        throw httpError(404, 'Group not found.');
    }
    if (String(group.organizationId) !== String(user.organizationId)) {
        throw httpError(403, 'You can only assign evidence to groups within your organization.');
    }
    groupId = body.groupId;
}
```

---

## Issue 3: Evidence Metadata Display

### Investigation

**Uploader Display** (EvidenceTable.jsx):
- Line 127-129: Shows static text "Authorized uploader" instead of actual uploader data
- Backend does populate uploadedBy (evidenceController.js line 218)
- Frontend ignores the populated data

**Group Display** (EvidenceTable.jsx):
- Line 123: Shows `file.groupName` if populated
- Backend populates groupId with name (evidenceController.js line 218)
- Should work correctly if group data is present

### Confirmed Root Cause

**File**: `dems-frontend-web/src/components/EvidenceTable.jsx`
**Function**: uploader display in table row
**Failing Condition**: Line 128 shows static text instead of using uploadedBy data

### Expected Fix

Change line 128 from:
```jsx
Authorized uploader
```
To:
```jsx
{file.uploadedBy?.profile?.displayName || file.UploaderWallet?.slice(0, 8) || 'Unknown'}
```

---

## Evidence Collection Needed

To confirm the diagnosis and verify the fix, please capture:

### Browser Network Tab (when clicking evidence):
1. Click the Network tab in DevTools
2. Click an evidence "Open" button
3. Capture:
   - Request URL
   - Request method
   - Request headers (especially Authorization)
   - Response status code
   - Response body

### Backend Terminal (when clicking evidence):
1. Watch terminal during the click
2. Capture any console logs showing:
   - Evidence ID being requested
   - User authentication
   - Authorization check results
   - Any error messages

### MongoDB Query (to verify group association):
```javascript
db.evidence.find({}, {fileName: 1, groupId: 1, organizationId: 1, uploadedBy: 1}).limit(5)
```

### Evidence Record Check:
Check if evidence records have:
- `groupId` field populated
- `uploadedBy` field populated
- `organizationId` matching the admin's organization

---

## Hypotheses vs Confirmed Findings

### Confirmed Findings (Based on Code Inspection)
- ✅ Route `/admin/evidence/:evidenceId` is missing from App.jsx
- ✅ EvidenceTable links to `/admin/evidence/:evidenceId`
- ✅ No group validation in evidencePipelineService.js
- ✅ Uploader display shows static text in EvidenceTable

### Hypotheses (Require Runtime Verification)
- ⚠️ JWT token is valid and includes Authorization header (requires Network tab capture)
- ⚠️ Evidence records exist with correct organizationId (requires MongoDB query)
- ⚠️ EvidenceDetails component would work if route existed (requires testing after fix)
- ⚠️ Group validation would prevent cross-organization access (requires testing after fix)

---

## Prioritized Fix Order

1. **CRITICAL**: Add missing route `/admin/evidence/:evidenceId` in App.jsx
2. **HIGH**: Add groupId validation in evidencePipelineService.js
3. **MEDIUM**: Fix uploader display in EvidenceTable.jsx
4. **LOW**: Verify group display works correctly

---

## Testing Required After Fixes

### Manual Test 1: Image Click
1. Log in as admin
2. Navigate to `/admin/evidence`
3. Click "Open" on an evidence item
4. **Expected**: Navigate to `/admin/evidence/:evidenceId` and show EvidenceDetails
5. **Expected**: No redirect to login

### Manual Test 2: Group Validation
1. As employee, use API client to upload with groupId from another organization
2. **Expected**: 403 Forbidden error or 404 Group not found
3. As employee, upload with valid groupId from own organization
4. **Expected**: Upload succeeds, groupId stored correctly

### Manual Test 3: Uploader Display
1. Admin views evidence list
2. **Expected**: Uploader column shows actual uploader name or wallet address

---

## Summary

**Root Cause 1 (Image Redirect)**: Missing route in App.jsx - confirmed by code inspection
**Root Cause 2 (Group Security)**: No backend validation - confirmed by code inspection  
**Root Cause 3 (Uploader Display)**: Static text in component - confirmed by code inspection

All three issues are confirmed through static code analysis. Runtime verification is needed to confirm the fixes work as expected and to identify any additional issues that only appear at runtime.
