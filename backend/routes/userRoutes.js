const express = require('express');
const {
    getAllUsersAdmin,
    banUser,
    unbanUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin/all', protect, admin, getAllUsersAdmin);
router.patch('/admin/:id/ban', protect, admin, banUser);
router.patch('/admin/:id/unban', protect, admin, unbanUser);

module.exports = router;
