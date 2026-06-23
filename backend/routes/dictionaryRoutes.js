const express = require('express');
const router = express.Router();
const { getWordMeaning, translateText } = require('../controllers/dictionaryController');
const { protect } = require('../middleware/authMiddleware');

router.get('/meaning/:word', protect, getWordMeaning);
router.get('/translate', protect, translateText);

module.exports = router;
