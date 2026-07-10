const express = require('express');
const router = express.Router();
const { uploadEvidence, getMyFiles, getEvidenceByCase, finalizeEvidence, getEvidenceById } = require('../controllers/evidenceController');
const { verifyEvidenceBlockchain } = require('../controllers/evidenceVerificationController');
const upload = require('../middleware/multer');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

//need to add protect middleware 
router.post('/upload', protect , upload.single('evidence'), uploadEvidence);
router.post('/finalize/:evidenceId', protect, authorizeRoles('officer', 'admin'), finalizeEvidence);
router.get('/my-files', protect ,  getMyFiles);
router.get('/download/:id' ,protect, getEvidenceById);
router.post('/:id/verify-blockchain', protect, verifyEvidenceBlockchain);

router.get('/case/:caseId', protect, authorizeRoles('officer', 'admin'), getEvidenceByCase); // no need to check this now

module.exports =  router;
