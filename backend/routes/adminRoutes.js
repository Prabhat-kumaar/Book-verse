const express = require('express');
const { register, login } = require('../controllers/authController');

const router = express.Router();

router.post('/register', (req, res, next) => {
    req.body.role = 'admin';
    register(req, res, next);
});
router.post('/login', login);

module.exports = router;
