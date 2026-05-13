const express = require('express');
const { getUserStreak } = require('../controllers/streakController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUserStreak);

module.exports = router;
