const express = require('express');
const router = express.Router();
const { trackProgress, getProgressByUser } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, trackProgress);
router.get('/', protect, getProgressByUser);

module.exports = router;
