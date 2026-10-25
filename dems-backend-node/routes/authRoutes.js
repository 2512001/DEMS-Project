const express = require('express');
const { generateNonce, verifySignature, getMe, updateProfile, sendEmailOtp, verifyEmailOtp } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/nonce/:walletAddress', generateNonce);
router.post('/verify', verifySignature);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/send-email-otp', protect, sendEmailOtp);
router.post('/verify-email-otp', protect, verifyEmailOtp);

module.exports = router;
