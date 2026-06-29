const express = require('express');
const router = express.Router();
const {
    createHighlight,
    getHighlightsByBook,
    deleteHighlight,
    updateHighlightNote,
} = require('../controllers/highlightController');
const { protect } = require('../middleware/authMiddleware');

// REST API routes for Highlights
router.post('/', protect, createHighlight);
router.get('/:bookId', protect, getHighlightsByBook);
router.delete('/:id', protect, deleteHighlight);
router.patch('/:id', protect, updateHighlightNote);

module.exports = router;
