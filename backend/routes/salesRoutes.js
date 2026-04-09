const express = require('express');
const router = express.Router();
const { createSale, getSales, getSaleById } = require('../controllers/salesController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, createSale)
    .get(protect, getSales); // Admins or staff can view

router.get('/:id', protect, getSaleById);

module.exports = router;
