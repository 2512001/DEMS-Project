const express = require('express');
const {
    createModificationRequest,
    listModificationRequests,
    reviewModificationRequest,
    submitModifiedFile
} = require('../controllers/modificationController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/multer');

const router = express.Router();

router.post('/', protect, authorizeRoles('officer'), createModificationRequest);
router.get('/', protect, authorizeRoles('officer', 'admin'), listModificationRequests);
router.post('/:id/submit-file', protect, authorizeRoles('officer'), upload.single('evidence'), submitModifiedFile);
router.post('/:id/review', protect, authorizeRoles('admin'), reviewModificationRequest);

module.exports = router;
