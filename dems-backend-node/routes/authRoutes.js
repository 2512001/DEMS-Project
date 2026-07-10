const express = require('express');
const { generateNonce, verifySignature, getMe, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/nonce/:walletAddress', generateNonce);
router.post('/verify', verifySignature);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
