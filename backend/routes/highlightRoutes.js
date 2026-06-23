const express = require('express');
const router = express.Router();
const {
    createHighlight,
    getHighlightsByBook,
    deleteHighlight,
} = require('../controllers/highlightController');
const { protect } = require('../middleware/authMiddleware');

// REST API routes for Highlights
router.post('/', protect, createHighlight);
router.get('/:bookId', protect, getHighlightsByBook);
router.delete('/:id', protect, deleteHighlight);

module.exports = router;
