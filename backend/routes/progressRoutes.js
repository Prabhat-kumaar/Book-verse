const express = require('express');
const router = express.Router();
const { trackProgress, getProgressByUser } = require('../controllers/progressController');

router.post('/', trackProgress);
router.get('/', getProgressByUser);

module.exports = router;
