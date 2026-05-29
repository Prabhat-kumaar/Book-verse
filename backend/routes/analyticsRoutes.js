const express = require('express');
const {
    getDailyAnalytics,
    getWeeklyAnalytics,
    getOverallAnalytics,
    recordVisit,
    getAdminAnalytics,
    getAdminDetails,
} = require('../controllers/analyticsController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/daily', protect, getDailyAnalytics);
router.get('/weekly', protect, getWeeklyAnalytics);
router.get('/overall', protect, getOverallAnalytics);
router.post('/visit', recordVisit);
router.get('/admin/details', protect, admin, getAdminDetails);
router.get('/admin', protect, admin, getAdminAnalytics);

module.exports = router;
