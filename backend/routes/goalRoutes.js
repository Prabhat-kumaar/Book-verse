const express = require('express');
const router = express.Router();
const {
    createOrUpdateGoal,
    getMyGoal,
    getMyHistory,
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createOrUpdateGoal);
router.get('/me', protect, getMyGoal);
router.get('/me/history', protect, getMyHistory);

module.exports = router;
