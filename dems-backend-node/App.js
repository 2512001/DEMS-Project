require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect }  = require("./connectionDb/connectDb");
const evidenceRoutes  = require('./routes/evidenceRoutes');


//connect database 
connect();

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middlewares
// Enable CORS for frontend communication
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//APi 
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'Active',
        message: 'DEMS API Gateway is running smoothly.'
    });
});


//router middleware
app.use('/api/Evidence' , evidenceRoutes);



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

// 5. Start Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 DEMS API Gateway running on port ${PORT}`);
    console.log(`=========================================`);
});