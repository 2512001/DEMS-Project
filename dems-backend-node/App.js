require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require("./connectionDb/connectDb");
const evidenceRoutes = require('./routes/evidenceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const quarantineRoutes = require('./routes/quarantineRoutes');
const modificationRoutes = require('./routes/modificationRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const invitationRoutes = require('./routes/invitationRoutes');
const { initializeTransporter } = require('./services/emailService');
const mongoose = require("mongoose");


//connect database 
connect();

// Initialize email service
initializeTransporter();





const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



//router middleware
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/Evidence', evidenceRoutes);
app.use('/api/quarantine', quarantineRoutes);
app.use('/api/modifications', modificationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/invitations', invitationRoutes);



// Catch-all for 404 Not Found routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'API Route Not Found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
 //   console.error(`[Error]: ${err.message}`);
    const status = err.statusCode || 500;
    const isUploadError = err.message === 'Unsupported file type.' || err.code === 'LIMIT_FILE_SIZE';
    res.status(isUploadError ? 400 : status).json({
        success: false,
        message: isUploadError
            ? (err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 50MB upload limit.' : err.message)
            : (status === 500 ? 'Internal Server Error' : err.message)
    });
});


app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 DEMS API Gateway running on port ${PORT}`);
    console.log(`=========================================`);
});
