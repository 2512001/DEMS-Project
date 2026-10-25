# DEMS Retention Route Redirect Issue - Root Cause and Fix

## Root Cause Analysis

**Problem**: Clicking "Retention" in the sidebar redirected to the login page even when logged in as Super Admin.

**Root Cause**: The user was accessing the application on `http://127.0.0.1:5173/`, but the dev server with the updated code was running on `http://127.0.0.1:5174/` because port 5173 was already in use by an older version of the application that did not have the Retention route registered.

**How it happened**:
1. The Retention route was added to App.jsx
2. The frontend was built successfully
3. When starting `npm run dev`, Vite detected port 5173 was in use
4. Vite automatically switched to port 5174
5. The user continued accessing the old version on port 5173
6. The old version did not have the `/superadmin/retention` route
7. React Router fell through to the wildcard route `*` which redirects to `/`
8. Since the user wasn't authenticated on the old server instance, it redirected to login

**Route Configuration**: The actual route configuration in App.jsx was correct:
```jsx
<Route element={<RequireAuth roles={['super_admin']} />}>
  <Route element={<AppLayout section="superadmin" />}>
    <Route path="/superadmin/retention" element={<RetentionManagement />} />
  </Route>
</Route>
```

This matches the working Global Users route:
```jsx
<Route path="/superadmin/users" element={<GlobalUsers />} />
```

Both routes are inside the same `RequireAuth roles={['super_admin']}` guard, so if one works, the other should work when the code is actually loaded.

---

## Fix Applied

**Action**: Killed the old dev server process (PID 16800) running on port 5173 and restarted the dev server on the correct port.

**Commands executed**:
```bash
netstat -ano | findstr :5173  # Found PID 16800
taskkill //F //PID 16800      # Killed old process
npm run dev                    # Restarted on port 5173
```

**Result**: Dev server now running on `http://127.0.0.1:5173/` with the updated code.

---

## Verification Status

✅ Dev server: Running on http://127.0.0.1:5173
✅ Backend server: Running on http://127.0.0.1:3000
✅ Route configuration: Correct
✅ RequireAuth guard: Correct (super_admin role)
✅ Sidebar navigation: Added to Super Admin section
✅ Page name mapping: Added to PAGE_NAMES

---

## Testing Instructions

Please refresh your browser and verify:

1. **Navigate to http://127.0.0.1:5173/**
2. **Refresh the page** to load the updated code
3. **Check the sidebar** - "Retention" link should be visible under "Platform"
4. **Click "Retention"** - Should navigate to `/superadmin/retention`
5. **Expected result**: Page loads with "Retention management" header and dry-run panel

If you still see a redirect to login after refreshing, please:
1. Check browser console for any errors
2. Verify you're actually logged in as Super Admin
3. Check that the dev server shows 5173 (not 5174)

---

## Summary

**Root Cause**: Viewing old application instance on port 5173 instead of updated instance on port 5174

**Fix**: Restarted dev server on port 5173 with updated code

**Impact**: None - route configuration was already correct

**Security**: No changes to authentication, authorization, or role checks

The Retention route should now be accessible at `http://127.0.0.1:5173/superadmin/retention` when logged in as Super Admin.
