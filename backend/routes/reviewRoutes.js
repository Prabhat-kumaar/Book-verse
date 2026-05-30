const express = require('express');
const router = express.Router();
const {
    addOrUpdateReview,
    getBookReviews,
    deleteReview,
    getMyReviews,
} = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

// Get all my reviews (must be defined BEFORE parametric bookId route to prevent route collision)
router.get('/user/me', protect, getMyReviews);

// Parametric bookId routes
router.post('/:bookId', protect, addOrUpdateReview);
router.get('/:bookId', getBookReviews);
router.delete('/:bookId', protect, deleteReview);

module.exports = router;
