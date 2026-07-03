const express = require('express');
const router = express.Router();
const { uploadEvidence } = require('../controllers/evidenceController');
const upload = require('../middleware/multer');


router.post('/upload', upload.single('evidence') , uploadEvidence);

module.exports =  router;