const express = require('express');
const {
    getBlockchainMonitoring,
    getStorageMonitoring
} = require('../controllers/monitoringController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/blockchain', protect, authorizeRoles('super_admin'), getBlockchainMonitoring);
router.get('/storage', protect, authorizeRoles('super_admin'), getStorageMonitoring);

module.exports = router;
