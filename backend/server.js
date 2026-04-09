const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const db = require('./config/db'); // Test DB connection

const app = express();

// Middlewares
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: false
}));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Inventory Management API is running' });
});

// Import API routes 
const productRoutes = require('./routes/productRoutes');
const salesRoutes = require('./routes/salesRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Use routes
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend'), {
    extensions: ['html'],
    index: 'landing.html' // Set the default / route to load landing.html
}));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
