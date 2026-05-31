const express = require('express');
const router = express.Router();
const {
    addBook,
    getAllBooks,
    getBooksByCategory,
    getBookById,
    updateBook,
    deleteBook,
    getRecommendations,
} = require('../controllers/bookController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadLimiter } = require('../middleware/rateLimitMiddleware');

router.post(
    '/',
    uploadLimiter,
    protect,
    admin,
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
    ]),
    addBook
);
router.get('/', getAllBooks);
router.get('/recommendations', getRecommendations);
router.get('/category/:category', getBooksByCategory);
router.get('/:id', getBookById);
router.put(
    '/:id',
    uploadLimiter,
    protect,
    admin,
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
    ]),
    updateBook
);
router.delete('/:id', protect, admin, deleteBook);

module.exports = router;
