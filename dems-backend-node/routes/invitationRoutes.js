const express = require('express');

const {
    createAdminInvitation,
    createEmployeeInvitation,
    getInvitationByToken,
    acceptAdminInvitation,
    acceptEmployeeInvitation,
    submitEmployeeApplication,
    getPendingInvitations,
    revokeInvitation
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/multer');
 
    
const router = express.Router();

// Public invitation lookup (no auth required for viewing invitation)
router.get('/token/:token', getInvitationByToken);

// Protected invitation management
router.post('/admin/create', protect, authorizeRoles('super_admin', 'admin'), createAdminInvitation);
router.post('/employee/create', protect, authorizeRoles('admin'), createEmployeeInvitation);
router.get('/pending/:organizationId', protect, getPendingInvitations);
router.delete('/:invitationId/revoke', protect, revokeInvitation);

// Accept invitation routes (require auth)
router.post('/admin/:token/accept', protect, acceptAdminInvitation);
router.post('/employee/:token/accept', protect, acceptEmployeeInvitation);
router.post('/employee/:token/submit', protect, upload.fields([
    { name: 'documents', maxCount: 8 }
]), submitEmployeeApplication);

module.exports = router;