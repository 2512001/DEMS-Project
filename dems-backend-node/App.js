require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require("./connectionDb/connectDb");
const evidenceRoutes = require('./routes/evidenceRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mongoose = require("mongoose");


//connect database 
connect();





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



// Catch-all for 404 Not Found routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'API Route Not Found'
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[Error]: ${err.message}`);
    res.status(500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});


app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 DEMS API Gateway running on port ${PORT}`);
    console.log(`=========================================`);
});
