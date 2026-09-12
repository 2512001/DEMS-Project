const express = require('express');
const {
    listOrganizations,
    createOrganization,
    assignOrganizationAdmin,
    getMyOrganization,
    updateOrganizationSettings,
    getOrganizationOverview,
    getOrganizationDetails,
    getOrganizationAdmins,
    resolveOrganizationByCode
} = require('../controllers/organizationController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Super Admin only endpoints
router.get('/directory', protect, authorizeRoles('super_admin'), listOrganizations);
router.post('/create', protect, authorizeRoles('super_admin'), createOrganization);
router.post('/assign-admin', protect, authorizeRoles('super_admin'), assignOrganizationAdmin);

// Organization details (super admin and org admin)
router.get('/:organizationId', protect, getOrganizationDetails);
router.get('/:organizationId/admins', protect, getOrganizationAdmins);

// Organization Admin endpoints
router.get('/me', protect, getMyOrganization);
router.get('/overview', protect, authorizeRoles('admin'), getOrganizationOverview);
router.put('/settings', protect, authorizeRoles('admin'), updateOrganizationSettings);

// Public endpoints for organization lookup
router.get('/resolve/:code', protect, resolveOrganizationByCode);

module.exports = router;
