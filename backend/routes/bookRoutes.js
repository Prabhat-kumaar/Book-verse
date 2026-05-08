const express = require('express');
const router = express.Router();
const {
    addBook,
    getAllBooks,
    getBooksByCategory,
    updateBook,
    deleteBook,
} = require('../controllers/bookController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post(
    '/',
    protect,
    admin,
    upload.fields([
        { name: 'thumbnail', maxCount: 1 },
        { name: 'pdf', maxCount: 1 },
    ]),
    addBook
);
router.get('/', getAllBooks);
router.get('/category/:category', getBooksByCategory);
router.put('/:id', protect, admin, updateBook);
router.delete('/:id', protect, admin, deleteBook);

module.exports = router;
