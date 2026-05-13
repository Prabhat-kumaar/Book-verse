const express = require('express');
const {
    getDailyAnalytics,
    getWeeklyAnalytics,
    getOverallAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/daily', protect, getDailyAnalytics);
router.get('/weekly', protect, getWeeklyAnalytics);
router.get('/overall', protect, getOverallAnalytics);

module.exports = router;
