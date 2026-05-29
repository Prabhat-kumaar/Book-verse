const express = require('express');
const router = express.Router();
const {
    saveProgress,
    getProgressByUser,
    getProgressByBook,
    getContinueReading,
    markProgressCompleted,
} = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

// Standardized REST endpoints
router.post('/save', protect, saveProgress);
router.post('/complete', protect, markProgressCompleted);
router.get('/continue', protect, getContinueReading);
router.get('/book/:bookId', protect, getProgressByBook);
router.get('/user', protect, getProgressByUser);

// Legacy and helper endpoint mappings
router.get('/user/continue-reading', protect, getContinueReading);
router.get('/:bookId', protect, getProgressByBook);
router.post('/', protect, saveProgress);
router.get('/', protect, getProgressByUser);

module.exports = router;
