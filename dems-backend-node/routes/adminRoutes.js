const express = require('express');
const {
    submitVerificationRequest,
    submitVerificationRequestByCode,
    getUsers,
    getVerificationRequests,
    reviewVerificationRequest,
    reviewMembershipApplication,
    getAuditLogs,
    upgradeOfficer,
    getPlatformUsers
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/multer');

const router = express.Router();

router.post(
    '/verification-request',
    protect,
    authorizeRoles('citizen', 'officer', 'admin'),
    upload.fields([
        { name: 'badge', maxCount: 1 },
        { name: 'governmentId', maxCount: 1 },
        { name: 'aadhaar', maxCount: 1 },
        { name: 'supportingDocuments', maxCount: 8 }
    ]),
    submitVerificationRequest
);
router.post(
    '/verification-request-by-code',
    protect,
    authorizeRoles('citizen', 'officer', 'admin'),
    upload.fields([
        { name: 'badge', maxCount: 1 },
        { name: 'governmentId', maxCount: 1 },
        { name: 'aadhaar', maxCount: 1 },
        { name: 'supportingDocuments', maxCount: 8 }
    ]),
    submitVerificationRequestByCode
);
router.get('/verification-requests', protect, authorizeRoles('admin'), getVerificationRequests);
router.post('/verification-requests/review', protect, authorizeRoles('admin'), reviewVerificationRequest);
router.post('/membership-applications/review', protect, authorizeRoles('admin'), reviewMembershipApplication);
router.get('/users', protect, authorizeRoles('admin'), getUsers);
router.get('/platform-users', protect, authorizeRoles('super_admin'), getPlatformUsers);
router.get('/audit-logs', protect, authorizeRoles('admin'), getAuditLogs);
router.post('/upgrade-officer', protect, authorizeRoles('admin'), upgradeOfficer);

module.exports = router;
