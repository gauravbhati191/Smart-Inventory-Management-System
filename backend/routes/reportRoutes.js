const express = require('express');
const router = express.Router();
const { getDashboardStats, getRecentActions } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/recent-actions', protect, getRecentActions);

module.exports = router;
