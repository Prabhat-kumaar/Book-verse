const express = require('express');
const { register, login } = require('../controllers/authController');
const { protect, admin } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.post('/register', protect, admin, (req, res, next) => {
    req.allowAdminCreation = true;
    register(req, res, next);
});
router.post('/login', authLimiter, login);

module.exports = router;
