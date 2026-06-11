const express = require('express');
const router = express.Router();
const {
    addBook,
    getAllBooks,
    getBooksByCategory,
    getBookById,
    getBookBySlug,
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
router.get('/slug/:slug', getBookBySlug);
router.get('/all', async (req, res, next) => {
    try {
        const Book = require('../models/Book');
        const books = await Book.find({}).select('slug title updatedAt createdAt').lean();
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json(books);
    } catch (error) {
        next(error);
    }
});
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
