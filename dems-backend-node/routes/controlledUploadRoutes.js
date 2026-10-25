const express = require('express');
const {
    createPendingUpload,
    signPendingUpload,
    approvePendingUpload,
    superAdminApprovePendingUpload,
    rejectPendingUpload,
    listPendingUploads,
    getPendingUploadById
} = require('../controllers/controlledUploadController');
const { uploadMemory } = require('../middleware/multer');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Create pending upload request (all authenticated users)
router.post('/pending', protect, uploadMemory.single('evidence'), createPendingUpload);

// Sign pending upload (uploader authorization)
router.post('/pending/:requestId/sign', protect, signPendingUpload);

// Approve pending upload (Organization Admin)
router.post('/pending/:requestId/approve', protect, authorizeRoles('admin'), approvePendingUpload);

// Approve pending upload (Super Admin)
router.post('/pending/:requestId/super-approve', protect, authorizeRoles('super_admin'), superAdminApprovePendingUpload);

// Reject pending upload (Admin or Super Admin)
router.post('/pending/:requestId/reject', protect, authorizeRoles('admin', 'super_admin'), rejectPendingUpload);

// List pending uploads (role-based access)
router.get('/pending', protect, listPendingUploads);

// Get pending upload by ID
router.get('/pending/:requestId', protect, getPendingUploadById);

module.exports = router;
