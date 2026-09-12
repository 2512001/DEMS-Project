const express = require('express');
const { listQuarantine, getQuarantineById, reviewQuarantine } = require('../controllers/quarantineController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', protect, authorizeRoles('officer', 'admin'), listQuarantine);
router.get('/:id', protect, authorizeRoles('officer', 'admin'), getQuarantineById);
router.post('/:id/review', protect, authorizeRoles('admin'), reviewQuarantine);

module.exports = router;
