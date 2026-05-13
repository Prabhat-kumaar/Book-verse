const express = require('express');
const {
    createCollection,
    deleteCollection,
    getCollections,
    getSavedBooksByCollection,
    getSavedStatus,
    removeSavedBook,
    renameCollection,
    saveBook,
} = require('../controllers/savedController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/collections', createCollection);
router.get('/collections', getCollections);
router.put('/collections/:id', renameCollection);
router.delete('/collections/:id', deleteCollection);

router.post('/saved-books', saveBook);
router.get('/saved-books/status', getSavedStatus);
router.delete('/saved-books/:id', removeSavedBook);
router.get('/saved-books/:collectionId', getSavedBooksByCollection);

module.exports = router;
